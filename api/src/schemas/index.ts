import { z } from 'zod';
import { extendZodWithOpenApi, OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { BUILD_STATUSES, HISTOGRAM_RANGES, STAGES } from '../domain.js';

extendZodWithOpenApi(z);

/** Single registry: every schema registered here shows up in /api/docs. */
export const registry = new OpenAPIRegistry();

// ---------- primitives ----------
export const ObjectIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, 'must be a 24-char hex ObjectId')
  .openapi({ example: '66f1c0a9e4b0b9d2a1c3e5f7' });

export const StageSchema = z.enum(STAGES).openapi('Stage', { example: 'alpha' });
export const BuildStatusSchema = z.enum(BUILD_STATUSES).openapi('BuildStatus', { example: 'success' });

const PaginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(25),
});

// ---------- projects ----------
export const ProjectSchema = registry.register(
  'Project',
  z.object({
    _id: ObjectIdSchema,
    name: z.string().openapi({ example: 'DTP3-CrossPoint' }),
    codename: z.string().openapi({ example: 'orion' }),
    partNumber: z.string().openapi({ example: '60-1234-01' }),
    boards: z.array(z.string()).openapi({ example: ['main', 'io-expander'] }),
    branches: z.array(z.string()).openapi({ example: ['main', 'release/2.4'] }),
    description: z.string(),
  }),
);

export const CreateProjectSchema = registry.register(
  'CreateProject',
  z.object({
    name: z.string().min(1).max(80),
    codename: z.string().min(1).max(40),
    partNumber: z.string().min(1).max(40),
    boards: z.array(z.string().min(1)).min(1),
    branches: z.array(z.string().min(1)).min(1).default(['main']),
    description: z.string().max(500).default(''),
  }),
);

// ---------- builds ----------
export const BuildSchema = registry.register(
  'Build',
  z.object({
    _id: ObjectIdSchema,
    project: z.string(),
    branch: z.string(),
    board: z.string(),
    version: z.string().openapi({ example: '2.04.0017' }),
    stage: StageSchema,
    status: BuildStatusSchema,
    node: z.string().openapi({ example: 'build09-cloud' }),
    jenkinsBuildNumber: z.number().int(),
    durationSec: z.number(),
    artifacts: z.array(z.string()),
    startedAt: z.string().datetime(),
    finishedAt: z.string().datetime().optional(),
    triggeredBy: z.string(),
  }),
);

export const CreateBuildSchema = registry.register(
  'CreateBuild',
  z.object({
    project: z.string().min(1),
    branch: z.string().min(1),
    board: z.string().min(1),
    version: z.string().regex(/^\d+\.\d+\.\d+$/, 'expected MAJOR.MINOR.BUILD'),
    stage: z.enum(['nightly', 'weekly']).default('nightly'),
    status: BuildStatusSchema.default('queued'),
    node: z.string().min(1),
    jenkinsBuildNumber: z.number().int().positive(),
    durationSec: z.number().min(0).default(0),
    artifacts: z.array(z.string()).default([]),
    startedAt: z.coerce.date().default(() => new Date()),
    finishedAt: z.coerce.date().optional(),
    triggeredBy: z.string().default('scheduler'),
  }),
);

export const UpdateBuildStatusSchema = registry.register(
  'UpdateBuildStatus',
  z.object({
    status: BuildStatusSchema,
    durationSec: z.number().min(0).optional(),
    finishedAt: z.coerce.date().optional(),
    artifacts: z.array(z.string()).optional(),
  }),
);

export const ListBuildsQuery = PaginationQuery.extend({
  project: z.string().optional(),
  branch: z.string().optional(),
  board: z.string().optional(),
  stage: StageSchema.optional(),
  status: BuildStatusSchema.optional(),
  search: z.string().max(100).optional().openapi({ description: 'Case-insensitive match on version, node, or project' }),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  sort: z.enum(['startedAt', '-startedAt', 'durationSec', '-durationSec', 'version', '-version']).default('-startedAt'),
});

// ---------- releases ----------
export const ReleaseSchema = registry.register(
  'Release',
  z.object({
    _id: ObjectIdSchema,
    project: z.string(),
    version: z.string(),
    board: z.string(),
    stage: StageSchema,
    buildId: ObjectIdSchema,
    publishedBy: z.string(),
    publishedAt: z.string().datetime(),
    notes: z.string(),
  }),
);

export const PromoteBuildSchema = registry.register(
  'PromoteBuild',
  z.object({
    buildId: ObjectIdSchema,
    toStage: z.enum(['alpha', 'beta', 'rc', 'release']),
    publishedBy: z.string().min(1).max(80),
    notes: z.string().max(1000).default(''),
  }),
);

export const ListReleasesQuery = PaginationQuery.extend({
  project: z.string().optional(),
  stage: StageSchema.optional(),
});

// ---------- analytics ----------
export const HistogramQuery = z.object({
  range: z.enum(HISTOGRAM_RANGES).default('week'),
  project: z.string().optional(),
});

export const HistogramBucketSchema = registry.register(
  'HistogramBucket',
  z.object({
    bucket: z.string().openapi({ description: 'ISO date for the start of the bucket', example: '2026-10-27' }),
    alpha: z.number().int(),
    beta: z.number().int(),
    rc: z.number().int(),
    release: z.number().int(),
    total: z.number().int(),
  }),
);

export const SummarySchema = registry.register(
  'Summary',
  z.object({
    projects: z.number().int(),
    buildsLast30d: z.number().int(),
    successRateLast30d: z.number().openapi({ description: '0..1, over finished builds' }),
    releasesLast30d: z.number().int(),
    avgDurationSecLast30d: z.number(),
    busiestNode: z.object({ node: z.string(), builds: z.number().int() }).nullable(),
  }),
);

export const NodeLoadSchema = registry.register(
  'NodeLoad',
  z.object({
    node: z.string(),
    builds: z.number().int(),
    failed: z.number().int(),
    avgDurationSec: z.number(),
  }),
);

// ---------- common ----------
export const ErrorSchema = registry.register(
  'Error',
  z.object({
    error: z.string(),
    details: z.unknown().optional(),
  }),
);

export function paginated<T extends z.ZodTypeAny>(item: T, name: string) {
  return registry.register(
    name,
    z.object({
      items: z.array(item),
      page: z.number().int(),
      pageSize: z.number().int(),
      total: z.number().int(),
      totalPages: z.number().int(),
    }),
  );
}

export const PaginatedBuilds = paginated(BuildSchema, 'PaginatedBuilds');
export const PaginatedReleases = paginated(ReleaseSchema, 'PaginatedReleases');
