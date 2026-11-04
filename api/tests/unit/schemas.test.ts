import { CreateBuildSchema, PromoteBuildSchema } from '../../src/schemas/index.js';
import { buildOpenApiDocument } from '../../src/openapi.js';

describe('request schemas', () => {
  it('CreateBuild enforces MAJOR.MINOR.BUILD versions and applies defaults', () => {
    const ok = CreateBuildSchema.parse({ project: 'p', branch: 'main', board: 'main', version: '1.2.3', node: 'n', jenkinsBuildNumber: 1 });
    expect(ok.status).toBe('queued');
    expect(ok.stage).toBe('nightly');
    expect(ok.startedAt).toBeInstanceOf(Date);
    expect(() => CreateBuildSchema.parse({ ...ok, version: 'v1' })).toThrow();
    expect(() => CreateBuildSchema.parse({ ...ok, stage: 'release' })).toThrow(); // pipelines can't create release builds directly
  });

  it('PromoteBuild only accepts release stages', () => {
    expect(() => PromoteBuildSchema.parse({ buildId: 'a'.repeat(24), toStage: 'nightly', publishedBy: 'x' })).toThrow();
    expect(PromoteBuildSchema.parse({ buildId: 'a'.repeat(24), toStage: 'rc', publishedBy: 'x' }).notes).toBe('');
  });
});

describe('OpenAPI document', () => {
  it('is generated from the registry with every route and schema', () => {
    const doc = buildOpenApiDocument();
    expect(doc.openapi).toBe('3.0.3');
    expect(Object.keys(doc.paths)).toHaveLength(10);
    expect(doc.components?.schemas).toHaveProperty('Build');
    expect(doc.components?.schemas).toHaveProperty('PromoteBuild');
    expect(doc.components?.schemas).toHaveProperty('HistogramBucket');
  });
});
