/**
 * Seeds the database with a realistic-looking set of projects, 90 days of CI
 * builds, and promotion events, so the dashboard has something to show.
 *
 *   npm run seed            # from repo root
 *   SEED=42 npm run seed    # deterministic data
 */
import mongoose from 'mongoose';
import { env } from '../config.js';
import { Project } from '../models/Project.js';
import { Build } from '../models/Build.js';
import { Release } from '../models/Release.js';
import type { BuildStatus, Stage } from '../domain.js';

// Small seeded PRNG so runs are reproducible.
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(Number(process.env.SEED ?? Date.now() % 100000));
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)]!;
const chance = (p: number) => rand() < p;

const PROJECTS = [
  { name: 'Matrix-Switcher-8x8', codename: 'orion', partNumber: '60-1101-01', boards: ['main', 'io-expander'], branches: ['main', 'release/3.1'] },
  { name: 'Video-Scaler-4K', codename: 'vega', partNumber: '60-1204-02', boards: ['main'], branches: ['main', 'release/2.4', 'feature/hdr'] },
  { name: 'Control-Processor-IPCP', codename: 'atlas', partNumber: '60-1322-01', boards: ['main', 'secure-element'], branches: ['main'] },
  { name: 'Audio-DSP-12x8', codename: 'lyra', partNumber: '60-1410-03', boards: ['main', 'dante-module'], branches: ['main', 'release/1.9'] },
  { name: 'Touch-Panel-10in', codename: 'nova', partNumber: '60-1550-01', boards: ['main', 'display'], branches: ['main', 'release/5.0'] },
  { name: 'Streaming-Encoder-H264', codename: 'draco', partNumber: '60-1633-02', boards: ['main'], branches: ['main'] },
  { name: 'USB-Extender-Pro', codename: 'pavo', partNumber: '60-1701-01', boards: ['tx', 'rx'], branches: ['main'] },
  { name: 'Room-Scheduler-Panel', codename: 'cetus', partNumber: '60-1808-01', boards: ['main'], branches: ['main', 'release/2.0'] },
];

const NODES = ['build01', 'build02', 'build03-win', 'build07-docker', 'build09-cloud', 'build10-cloud'];
const USERS = ['calvin.l', 'brendon.s', 'tom.r', 'deepthy.n', 'rafeeq.m'];
const DAY_MS = 86_400_000;

async function main() {
  await mongoose.connect(env.MONGO_URI);
  console.log('Connected; clearing collections…');
  await Promise.all([Project.deleteMany({}), Build.deleteMany({}), Release.deleteMany({})]);

  await Project.insertMany(PROJECTS.map((p) => ({ ...p, description: `${p.codename} firmware` })));

  const now = Date.now();
  const builds: Array<Record<string, unknown>> = [];
  const releases: Array<Record<string, unknown>> = [];

  for (const p of PROJECTS) {
    let buildNumber = 100 + Math.floor(rand() * 400);
    const major = 1 + Math.floor(rand() * 5);
    let minor = Math.floor(rand() * 10);
    let patch = Math.floor(rand() * 40);

    for (let day = 90; day >= 0; day--) {
      const isWeekly = day % 7 === 0;
      for (const branch of p.branches) {
        if (branch !== 'main' && chance(0.5)) continue; // non-main branches build less often
        for (const board of p.boards) {
          buildNumber += 1;
          patch += 1;
          const version = `${major}.${String(minor).padStart(2, '0')}.${String(patch).padStart(4, '0')}`;
          const startedAt = new Date(now - day * DAY_MS - Math.floor(rand() * 6) * 3_600_000 - 2 * 3_600_000);
          const durationSec = 300 + Math.floor(rand() * 2400);
          const finished = day > 0 || chance(0.8);
          const status: BuildStatus = !finished ? pick(['queued', 'running']) : chance(0.86) ? 'success' : chance(0.8) ? 'failed' : 'aborted';
          const stage: Stage = isWeekly ? 'weekly' : 'nightly';
          const node = pick(NODES);

          const build: Record<string, unknown> & { stage: Stage } = {
            project: p.name,
            branch,
            board,
            version,
            stage,
            status,
            node,
            jenkinsBuildNumber: buildNumber,
            durationSec: finished ? durationSec : 0,
            artifacts: finished && status === 'success' ? [`${p.codename}_${board}_${version}.bin`, `${p.codename}_${board}_${version}.map`] : [],
            startedAt,
            finishedAt: finished ? new Date(startedAt.getTime() + durationSec * 1000) : undefined,
            triggeredBy: chance(0.85) ? 'scheduler' : pick(USERS),
          };
          builds.push(build);

          // Promote a slice of successful main-branch builds through the lifecycle.
          if (status === 'success' && branch === 'main' && chance(0.12)) {
            const path: Stage[] = chance(0.5) ? ['alpha'] : chance(0.6) ? ['alpha', 'beta'] : ['alpha', 'beta', 'rc', 'release'];
            let offset = 1;
            for (const s of path) {
              const publishedAt = new Date(startedAt.getTime() + offset * DAY_MS);
              if (publishedAt.getTime() > now) break;
              releases.push({
                project: p.name,
                version,
                board,
                stage: s,
                buildIdRef: builds.length - 1,
                publishedBy: pick(USERS),
                publishedAt,
                notes: s === 'release' ? 'GA release' : '',
              });
              build.stage = s;
              offset += 2 + Math.floor(rand() * 5);
            }
          }
        }
      }
      if (chance(0.03)) {
        minor += 1;
        patch = 0;
      }
    }
  }

  const inserted = await Build.insertMany(builds, { ordered: true });
  const releaseDocs = releases.map(({ buildIdRef, ...r }) => ({ ...r, buildId: inserted[buildIdRef as number]!._id }));
  await Release.insertMany(releaseDocs);

  console.log(`Seeded ${PROJECTS.length} projects, ${inserted.length} builds, ${releaseDocs.length} releases.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
