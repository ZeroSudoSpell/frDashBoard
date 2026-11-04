import request from 'supertest';
import { createApp } from '../src/app.js';
import { Release } from '../src/models/Release.js';
import { clearTestDb, connectTestDb, disconnectTestDb } from './setup.js';
import { seedBuild, seedProject } from './fixtures.js';

const app = createApp();
const DAY = 86_400_000;

beforeAll(connectTestDb);
afterEach(clearTestDb);
afterAll(disconnectTestDb);

async function seedRelease(stage: 'alpha' | 'beta' | 'rc' | 'release', daysAgo: number) {
  const b = await seedBuild({ status: 'success', stage });
  return Release.create({
    project: b.project,
    version: b.version,
    board: b.board,
    stage,
    buildId: b._id,
    publishedBy: 'x',
    publishedAt: new Date(Date.now() - daysAgo * DAY),
  });
}

describe('GET /api/analytics/summary', () => {
  it('computes 30-day headline numbers', async () => {
    await seedProject();
    await seedBuild({ status: 'success', node: 'build01', durationSec: 100 });
    await seedBuild({ status: 'failed', node: 'build01', durationSec: 300 });
    await seedBuild({ status: 'running', node: 'build02', durationSec: 0 });
    await seedBuild({ status: 'success', node: 'build02', startedAt: new Date(Date.now() - 45 * DAY) }); // outside window
    await seedRelease('alpha', 3);

    const res = await request(app).get('/api/analytics/summary');
    expect(res.status).toBe(200);
    expect(res.body.projects).toBe(1);
    expect(res.body.buildsLast30d).toBe(4); // 3 builds + the one behind the release
    expect(res.body.successRateLast30d).toBeCloseTo(2 / 3); // 2 success of 3 finished
    expect(res.body.releasesLast30d).toBe(1);
    expect(res.body.busiestNode.node).toBe('build01');
  });

  it('handles an empty database', async () => {
    const res = await request(app).get('/api/analytics/summary');
    expect(res.body).toEqual({
      projects: 0,
      buildsLast30d: 0,
      successRateLast30d: 0,
      releasesLast30d: 0,
      avgDurationSecLast30d: 0,
      busiestNode: null,
    });
  });
});

describe('GET /api/analytics/release-histogram', () => {
  it('buckets releases by day and splits by stage', async () => {
    await seedRelease('alpha', 0);
    await seedRelease('alpha', 0);
    await seedRelease('rc', 0);
    await seedRelease('release', 2);
    await seedRelease('beta', 30); // outside the 10-day "day" window

    const res = await request(app).get('/api/analytics/release-histogram').query({ range: 'day' });
    expect(res.status).toBe(200);
    const total = res.body.reduce((n: number, b: { total: number }) => n + b.total, 0);
    expect(total).toBe(4);
    const today = res.body[res.body.length - 1];
    expect(today.alpha).toBe(2);
    expect(today.rc).toBe(1);
    expect(today.total).toBe(3);
  });

  it('rejects an unknown range', async () => {
    await request(app).get('/api/analytics/release-histogram').query({ range: 'year' }).expect(400);
  });
});

describe('GET /api/analytics/node-load', () => {
  it('aggregates per node', async () => {
    await seedBuild({ node: 'build09-cloud', status: 'failed', durationSec: 100 });
    await seedBuild({ node: 'build09-cloud', status: 'success', durationSec: 300 });
    await seedBuild({ node: 'build01', status: 'success', durationSec: 50 });
    const res = await request(app).get('/api/analytics/node-load');
    expect(res.body[0]).toEqual({ node: 'build09-cloud', builds: 2, failed: 1, avgDurationSec: 200 });
  });
});

describe('API docs', () => {
  it('serves a valid OpenAPI document covering every route', async () => {
    const res = await request(app).get('/api/openapi.json');
    expect(res.status).toBe(200);
    expect(res.body.openapi).toBe('3.0.3');
    const paths = Object.keys(res.body.paths);
    expect(paths).toEqual(
      expect.arrayContaining([
        '/api/projects',
        '/api/builds',
        '/api/builds/{id}',
        '/api/builds/{id}/status',
        '/api/releases',
        '/api/releases/promote',
        '/api/analytics/summary',
        '/api/analytics/release-histogram',
        '/api/analytics/node-load',
      ]),
    );
  });

  it('health endpoint reports db state', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.db).toBe('connected');
  });
});
