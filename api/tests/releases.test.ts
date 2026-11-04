import request from 'supertest';
import { createApp } from '../src/app.js';
import { Build } from '../src/models/Build.js';
import { Release } from '../src/models/Release.js';
import { clearTestDb, connectTestDb, disconnectTestDb } from './setup.js';
import { seedBuild } from './fixtures.js';

const app = createApp();

beforeAll(connectTestDb);
afterEach(clearTestDb);
afterAll(disconnectTestDb);

describe('POST /api/releases/promote', () => {
  it('promotes a successful nightly build to alpha and advances the build stage', async () => {
    const b = await seedBuild({ status: 'success', stage: 'nightly' });
    const res = await request(app)
      .post('/api/releases/promote')
      .send({ buildId: String(b._id), toStage: 'alpha', publishedBy: 'calvin.l', notes: 'first cut' });

    expect(res.status).toBe(201);
    expect(res.body.stage).toBe('alpha');
    expect(res.body.version).toBe(b.version);

    const updated = await Build.findById(b._id).lean();
    expect(updated?.stage).toBe('alpha');
    expect(await Release.countDocuments()).toBe(1);
  });

  it('rejects promoting a failed build', async () => {
    const b = await seedBuild({ status: 'failed' });
    const res = await request(app).post('/api/releases/promote').send({ buildId: String(b._id), toStage: 'alpha', publishedBy: 'x' });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/Only successful builds/);
  });

  it('rejects promotion backwards or sideways', async () => {
    const b = await seedBuild({ status: 'success', stage: 'beta' });
    const res = await request(app).post('/api/releases/promote').send({ buildId: String(b._id), toStage: 'alpha', publishedBy: 'x' });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/must move forward/);
  });

  it('rejects publishing the same version to the same stage twice (duplicate-release check)', async () => {
    const b1 = await seedBuild({ status: 'success', version: '2.00.0010' });
    await request(app).post('/api/releases/promote').send({ buildId: String(b1._id), toStage: 'alpha', publishedBy: 'x' }).expect(201);

    // Another build of the same version/board (e.g. a rebuild) tries to publish alpha again.
    const b2 = await seedBuild({ status: 'success', version: '2.00.0010' });
    const res = await request(app).post('/api/releases/promote').send({ buildId: String(b2._id), toStage: 'alpha', publishedBy: 'x' });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already published/);
    expect(await Release.countDocuments()).toBe(1);
  });

  it('walks a build through the full lifecycle', async () => {
    const b = await seedBuild({ status: 'success' });
    for (const toStage of ['alpha', 'beta', 'rc', 'release'] as const) {
      await request(app).post('/api/releases/promote').send({ buildId: String(b._id), toStage, publishedBy: 'x' }).expect(201);
    }
    expect((await Build.findById(b._id).lean())?.stage).toBe('release');
    const list = await request(app).get('/api/releases').query({ stage: 'rc' });
    expect(list.body.total).toBe(1);
  });

  it('validates the body', async () => {
    const res = await request(app).post('/api/releases/promote').send({ buildId: 'nope', toStage: 'nightly' });
    expect(res.status).toBe(400);
    expect(res.body.details.fieldErrors).toHaveProperty('buildId');
    expect(res.body.details.fieldErrors).toHaveProperty('toStage');
    expect(res.body.details.fieldErrors).toHaveProperty('publishedBy');
  });
});
