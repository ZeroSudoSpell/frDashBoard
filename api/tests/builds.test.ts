import request from 'supertest';
import { createApp } from '../src/app.js';
import { clearTestDb, connectTestDb, disconnectTestDb } from './setup.js';
import { seedBuild, seedProject } from './fixtures.js';

const app = createApp();

beforeAll(connectTestDb);
afterEach(clearTestDb);
afterAll(disconnectTestDb);

describe('GET /api/builds', () => {
  it('returns a paginated, filtered, sorted page', async () => {
    await seedProject();
    await seedBuild({ version: '3.01.0001', status: 'success', startedAt: new Date('2026-10-01') });
    await seedBuild({ version: '3.01.0002', status: 'failed', startedAt: new Date('2026-10-02') });
    await seedBuild({ version: '3.01.0003', status: 'success', startedAt: new Date('2026-10-03') });

    const res = await request(app).get('/api/builds').query({ status: 'success', pageSize: 1, sort: '-startedAt' });
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    expect(res.body.totalPages).toBe(2);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].version).toBe('3.01.0003');
  });

  it('rejects invalid query params with 400 and details', async () => {
    const res = await request(app).get('/api/builds').query({ status: 'bogus', page: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
    expect(res.body.details.fieldErrors).toHaveProperty('status');
    expect(res.body.details.fieldErrors).toHaveProperty('page');
  });

  it('searches across version, node and project', async () => {
    await seedBuild({ node: 'build09-cloud', version: '1.00.0001' });
    await seedBuild({ node: 'build01', version: '1.00.0002' });
    const res = await request(app).get('/api/builds').query({ search: 'cloud' });
    expect(res.body.total).toBe(1);
    expect(res.body.items[0].node).toBe('build09-cloud');
  });
});

describe('POST /api/builds', () => {
  it('creates a build for a known project/board', async () => {
    await seedProject({ boards: ['main'] });
    const res = await request(app).post('/api/builds').send({
      project: 'Matrix-Switcher-8x8',
      branch: 'main',
      board: 'main',
      version: '3.02.0001',
      node: 'build01',
      jenkinsBuildNumber: 42,
    });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('queued');
    expect(res.body.stage).toBe('nightly');
  });

  it('returns 422 for an unknown board and lists valid ones', async () => {
    await seedProject({ boards: ['main'] });
    const res = await request(app).post('/api/builds').send({
      project: 'Matrix-Switcher-8x8',
      branch: 'main',
      board: 'nope',
      version: '3.02.0001',
      node: 'build01',
      jenkinsBuildNumber: 43,
    });
    expect(res.status).toBe(422);
    expect(res.body.details.boards).toEqual(['main']);
  });

  it('returns 409 on a duplicate build number', async () => {
    await seedProject({ boards: ['main'] });
    const body = { project: 'Matrix-Switcher-8x8', branch: 'main', board: 'main', version: '3.02.0001', node: 'build01', jenkinsBuildNumber: 7 };
    await request(app).post('/api/builds').send(body).expect(201);
    const res = await request(app).post('/api/builds').send(body);
    expect(res.status).toBe(409);
  });
});

describe('PATCH /api/builds/:id/status', () => {
  it('finishes a running build and stamps finishedAt', async () => {
    const b = await seedBuild({ status: 'running' });
    const res = await request(app).patch(`/api/builds/${b._id}/status`).send({ status: 'success', durationSec: 900 });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.durationSec).toBe(900);
    expect(res.body.finishedAt).toBeDefined();
  });

  it('refuses to change a terminal state', async () => {
    const b = await seedBuild({ status: 'failed' });
    const res = await request(app).patch(`/api/builds/${b._id}/status`).send({ status: 'success' });
    expect(res.status).toBe(409);
  });

  it('returns 404 for an unknown id and 400 for a malformed one', async () => {
    await request(app).patch('/api/builds/66f1c0a9e4b0b9d2a1c3e5f7/status').send({ status: 'success' }).expect(404);
    await request(app).patch('/api/builds/not-an-id/status').send({ status: 'success' }).expect(400);
  });
});
