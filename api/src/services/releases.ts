import mongoose from 'mongoose';
import type { z } from 'zod';
import { Build } from '../models/Build.js';
import { Release } from '../models/Release.js';
import { HttpError } from '../middleware/errors.js';
import { canPromote } from '../domain.js';
import type { ListReleasesQuery, PromoteBuildSchema } from '../schemas/index.js';

export async function listReleases(q: z.infer<typeof ListReleasesQuery>) {
  const filter: Record<string, unknown> = {};
  if (q.project) filter.project = q.project;
  if (q.stage) filter.stage = q.stage;

  const [items, total] = await Promise.all([
    Release.find(filter)
      .sort({ publishedAt: -1, _id: 1 })
      .skip((q.page - 1) * q.pageSize)
      .limit(q.pageSize)
      .lean(),
    Release.countDocuments(filter),
  ]);
  return { items, page: q.page, pageSize: q.pageSize, total, totalPages: Math.max(1, Math.ceil(total / q.pageSize)) };
}

/**
 * Promote a build to a later lifecycle stage.
 *
 * Mirrors the guardrails of a real release pipeline:
 *  - only successful builds can be promoted
 *  - promotion only moves forward (nightly -> alpha -> beta -> rc -> release)
 *  - the same version cannot be published to the same stage twice (duplicate-release check)
 *
 * Runs in a transaction when the connection supports it (replica set) so the
 * Release record and the Build's stage advance atomically.
 */
export async function promoteBuild(input: z.infer<typeof PromoteBuildSchema>) {
  const build = await Build.findById(input.buildId);
  if (!build) throw new HttpError(404, `Build ${input.buildId} not found`);
  if (build.status !== 'success') {
    throw new HttpError(409, `Only successful builds can be promoted (build is ${build.status})`);
  }
  if (!canPromote(build.stage, input.toStage)) {
    throw new HttpError(409, `Cannot promote from ${build.stage} to ${input.toStage}; promotion must move forward`);
  }

  const duplicate = await Release.exists({
    project: build.project,
    board: build.board,
    version: build.version,
    stage: input.toStage,
  });
  if (duplicate) {
    throw new HttpError(409, `${build.project} ${build.version} (${build.board}) is already published to ${input.toStage}`);
  }

  const doWork = async (session?: mongoose.ClientSession) => {
    const [release] = await Release.create(
      [
        {
          project: build.project,
          version: build.version,
          board: build.board,
          stage: input.toStage,
          buildId: build._id,
          publishedBy: input.publishedBy,
          publishedAt: new Date(),
          notes: input.notes,
        },
      ],
      session ? { session } : {},
    );
    build.stage = input.toStage;
    await build.save(session ? { session } : {});
    return release!.toObject();
  };

  const supportsTransactions = await transactionsSupported();
  if (!supportsTransactions) return doWork();

  const session = await mongoose.startSession();
  try {
    let result: Awaited<ReturnType<typeof doWork>> | undefined;
    await session.withTransaction(async () => {
      result = await doWork(session);
    });
    return result!;
  } finally {
    await session.endSession();
  }
}

let txSupport: boolean | undefined;
async function transactionsSupported(): Promise<boolean> {
  if (txSupport !== undefined) return txSupport;
  try {
    const admin = mongoose.connection.db?.admin();
    const hello = (await admin?.command({ hello: 1 })) as { setName?: string; msg?: string } | undefined;
    txSupport = Boolean(hello?.setName || hello?.msg === 'isdbgrid');
  } catch {
    txSupport = false;
  }
  return txSupport;
}

/** Test hook: forget the cached capability check. */
export function resetTransactionSupportCache() {
  txSupport = undefined;
}
