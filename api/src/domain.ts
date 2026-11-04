/**
 * Shared domain vocabulary. Kept as const tuples so the same values drive
 * Mongoose enums, Zod validation, and the OpenAPI spec.
 */

/** Lifecycle stages a firmware build moves through. Order matters: promotion only moves forward. */
export const STAGES = ['nightly', 'weekly', 'alpha', 'beta', 'rc', 'release'] as const;
export type Stage = (typeof STAGES)[number];

/** Stages that count as a "release" for analytics (anything promoted past CI builds). */
export const RELEASE_STAGES: readonly Stage[] = ['alpha', 'beta', 'rc', 'release'];

export const BUILD_STATUSES = ['queued', 'running', 'success', 'failed', 'aborted'] as const;
export type BuildStatus = (typeof BUILD_STATUSES)[number];

export const HISTOGRAM_RANGES = ['day', 'week', 'month'] as const;
export type HistogramRange = (typeof HISTOGRAM_RANGES)[number];

export function stageIndex(stage: Stage): number {
  return STAGES.indexOf(stage);
}

/** Promotion is only valid to a strictly later stage. */
export function canPromote(from: Stage, to: Stage): boolean {
  return stageIndex(to) > stageIndex(from);
}
