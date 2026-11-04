import type { FilterQuery } from 'mongoose';
import type { z } from 'zod';
import { Build, type BuildDoc } from '../models/Build.js';
import { Project } from '../models/Project.js';
import { HttpError } from '../middleware/errors.js';
import type { CreateBuildSchema, ListBuildsQuery, UpdateBuildStatusSchema } from '../schemas/index.js';

type ListQuery = z.infer<typeof ListBuildsQuery>;

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Translate validated query params into a Mongo filter. Kept pure for easy testing. */
export function buildFilter(q: ListQuery): FilterQuery<BuildDoc> {
  const filter: FilterQuery<BuildDoc> = {};
  if (q.project) filter.project = q.project;
  if (q.branch) filter.branch = q.branch;
  if (q.board) filter.board = q.board;
  if (q.stage) filter.stage = q.stage;
  if (q.status) filter.status = q.status;
  if (q.from || q.to) {
    filter.startedAt = {};
    if (q.from) filter.startedAt.$gte = q.from;
    if (q.to) filter.startedAt.$lte = q.to;
  }
  if (q.search) {
    const re = new RegExp(escapeRegex(q.search), 'i');
    filter.$or = [{ version: re }, { node: re }, { project: re }];
  }
  return filter;
}

export async function listBuilds(q: ListQuery) {
  const filter = buildFilter(q);
  const sortField = q.sort.replace(/^-/, '');
  const sortDir = q.sort.startsWith('-') ? -1 : 1;

  const [items, total] = await Promise.all([
    Build.find(filter)
      .sort({ [sortField]: sortDir, _id: 1 })
      .skip((q.page - 1) * q.pageSize)
      .limit(q.pageSize)
      .lean(),
    Build.countDocuments(filter),
  ]);

  return {
    items,
    page: q.page,
    pageSize: q.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / q.pageSize)),
  };
}

export async function getBuild(id: string) {
  const build = await Build.findById(id).lean();
  if (!build) throw new HttpError(404, `Build ${id} not found`);
  return build;
}

export async function createBuild(input: z.infer<typeof CreateBuildSchema>) {
  const project = await Project.findOne({ name: input.project }).lean();
  if (!project) throw new HttpError(422, `Unknown project "${input.project}"`);
  if (!project.boards.includes(input.board)) {
    throw new HttpError(422, `Board "${input.board}" is not configured for ${input.project}`, {
      boards: project.boards,
    });
  }
  const created = await Build.create(input);
  return created.toObject();
}

export async function updateBuildStatus(id: string, patch: z.infer<typeof UpdateBuildStatusSchema>) {
  const build = await Build.findById(id);
  if (!build) throw new HttpError(404, `Build ${id} not found`);

  const terminal = ['success', 'failed', 'aborted'];
  if (terminal.includes(build.status) && build.status !== patch.status) {
    throw new HttpError(409, `Build is already ${build.status}; terminal states cannot change`);
  }

  build.status = patch.status;
  if (patch.durationSec !== undefined) build.durationSec = patch.durationSec;
  if (patch.artifacts) build.artifacts = patch.artifacts;
  if (terminal.includes(patch.status)) build.finishedAt = patch.finishedAt ?? new Date();
  await build.save();
  return build.toObject();
}
