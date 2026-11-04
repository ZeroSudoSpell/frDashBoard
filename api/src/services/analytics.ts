import { Build } from '../models/Build.js';
import { Release } from '../models/Release.js';
import { Project } from '../models/Project.js';
import { RELEASE_STAGES, type HistogramRange } from '../domain.js';

/**
 * All dashboard analytics are computed in Mongo aggregation pipelines so the
 * API returns only the slice the chart needs rather than paging whole
 * collections through Node.
 */

const DAY_MS = 86_400_000;

function rangeConfig(range: HistogramRange): { since: Date; unit: 'day' | 'week' | 'month'; buckets: number } {
  const now = new Date();
  switch (range) {
    case 'day':
      return { since: new Date(now.getTime() - 10 * DAY_MS), unit: 'day', buckets: 10 };
    case 'week':
      return { since: new Date(now.getTime() - 5 * 7 * DAY_MS), unit: 'week', buckets: 5 };
    case 'month': {
      const since = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));
      return { since, unit: 'month', buckets: 6 };
    }
  }
}

export interface HistogramBucket {
  bucket: string;
  alpha: number;
  beta: number;
  rc: number;
  release: number;
  total: number;
}

/** Releases per time bucket, split by stage — the "Release History" chart. */
export async function releaseHistogram(range: HistogramRange, project?: string): Promise<HistogramBucket[]> {
  const { since, unit } = rangeConfig(range);
  const match: Record<string, unknown> = { publishedAt: { $gte: since }, stage: { $in: RELEASE_STAGES } };
  if (project) match.project = project;

  const rows = await Release.aggregate<{ _id: { bucket: Date; stage: string }; count: number }>([
    { $match: match },
    {
      $group: {
        _id: {
          bucket: { $dateTrunc: { date: '$publishedAt', unit, timezone: 'UTC' } },
          stage: '$stage',
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.bucket': 1 } },
  ]);

  const byBucket = new Map<string, HistogramBucket>();
  for (const row of rows) {
    const key = row._id.bucket.toISOString().slice(0, 10);
    const b = byBucket.get(key) ?? { bucket: key, alpha: 0, beta: 0, rc: 0, release: 0, total: 0 };
    const stage = row._id.stage as 'alpha' | 'beta' | 'rc' | 'release';
    b[stage] += row.count;
    b.total += row.count;
    byBucket.set(key, b);
  }
  return [...byBucket.values()].sort((a, b) => a.bucket.localeCompare(b.bucket));
}

export async function summary() {
  const since = new Date(Date.now() - 30 * DAY_MS);

  const [projects, buildStats, releasesLast30d, busiest] = await Promise.all([
    Project.countDocuments(),
    Build.aggregate<{ total: number; finished: number; succeeded: number; avgDuration: number }>([
      { $match: { startedAt: { $gte: since } } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          finished: { $sum: { $cond: [{ $in: ['$status', ['success', 'failed', 'aborted']] }, 1, 0] } },
          succeeded: { $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] } },
          avgDuration: { $avg: '$durationSec' },
        },
      },
    ]),
    Release.countDocuments({ publishedAt: { $gte: since }, stage: { $in: RELEASE_STAGES } }),
    Build.aggregate<{ _id: string; builds: number }>([
      { $match: { startedAt: { $gte: since } } },
      { $group: { _id: '$node', builds: { $sum: 1 } } },
      { $sort: { builds: -1, _id: 1 } },
      { $limit: 1 },
    ]),
  ]);

  const stats = buildStats[0] ?? { total: 0, finished: 0, succeeded: 0, avgDuration: 0 };
  return {
    projects,
    buildsLast30d: stats.total,
    successRateLast30d: stats.finished ? stats.succeeded / stats.finished : 0,
    releasesLast30d,
    avgDurationSecLast30d: Math.round(stats.avgDuration ?? 0),
    busiestNode: busiest[0] ? { node: busiest[0]._id, builds: busiest[0].builds } : null,
  };
}

/** Per-node load over the last 30 days — the data behind a fleet capacity view. */
export async function nodeLoad() {
  const since = new Date(Date.now() - 30 * DAY_MS);
  return Build.aggregate<{ node: string; builds: number; failed: number; avgDurationSec: number }>([
    { $match: { startedAt: { $gte: since } } },
    {
      $group: {
        _id: '$node',
        builds: { $sum: 1 },
        failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
        avgDurationSec: { $avg: '$durationSec' },
      },
    },
    { $project: { _id: 0, node: '$_id', builds: 1, failed: 1, avgDurationSec: { $round: ['$avgDurationSec', 0] } } },
    { $sort: { builds: -1, node: 1 } },
  ]);
}
