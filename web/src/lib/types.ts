/** API contract types. These mirror the Zod schemas in api/src/schemas. */

export const STAGES = ['nightly', 'weekly', 'alpha', 'beta', 'rc', 'release'] as const;
export type Stage = (typeof STAGES)[number];

export const RELEASE_STAGES = ['alpha', 'beta', 'rc', 'release'] as const;
export type ReleaseStage = (typeof RELEASE_STAGES)[number];

export const BUILD_STATUSES = ['queued', 'running', 'success', 'failed', 'aborted'] as const;
export type BuildStatus = (typeof BUILD_STATUSES)[number];

export type HistogramRange = 'day' | 'week' | 'month';

export interface Project {
  _id: string;
  name: string;
  codename: string;
  partNumber: string;
  boards: string[];
  branches: string[];
  description: string;
}

export interface Build {
  _id: string;
  project: string;
  branch: string;
  board: string;
  version: string;
  stage: Stage;
  status: BuildStatus;
  node: string;
  jenkinsBuildNumber: number;
  durationSec: number;
  artifacts: string[];
  startedAt: string;
  finishedAt?: string;
  triggeredBy: string;
}

export interface Release {
  _id: string;
  project: string;
  version: string;
  board: string;
  stage: Stage;
  buildId: string;
  publishedBy: string;
  publishedAt: string;
  notes: string;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface Summary {
  projects: number;
  buildsLast30d: number;
  successRateLast30d: number;
  releasesLast30d: number;
  avgDurationSecLast30d: number;
  busiestNode: { node: string; builds: number } | null;
}

export interface HistogramBucket {
  bucket: string;
  alpha: number;
  beta: number;
  rc: number;
  release: number;
  total: number;
}

export interface NodeLoad {
  node: string;
  builds: number;
  failed: number;
  avgDurationSec: number;
}

export type BuildSort = 'startedAt' | '-startedAt' | 'durationSec' | '-durationSec' | 'version' | '-version';

export interface BuildFilters {
  project?: string;
  branch?: string;
  board?: string;
  stage?: Stage;
  status?: BuildStatus;
  search?: string;
  sort: BuildSort;
  page: number;
  pageSize: number;
}

export interface ApiError {
  error: string;
  details?: unknown;
}
