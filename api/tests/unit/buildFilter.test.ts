import { buildFilter } from '../../src/services/builds.js';
import { ListBuildsQuery } from '../../src/schemas/index.js';

describe('buildFilter', () => {
  it('maps query params to a Mongo filter', () => {
    const q = ListBuildsQuery.parse({ project: 'X', status: 'failed', from: '2026-01-01', search: 'build0(9)' });
    const f = buildFilter(q);
    expect(f.project).toBe('X');
    expect(f.status).toBe('failed');
    expect(f.startedAt).toEqual({ $gte: new Date('2026-01-01') });
    // regex metacharacters in the free-text search are escaped
    expect((f.$or as Array<{ version: RegExp }>)[0]!.version.source).toBe('build0\\(9\\)');
  });

  it('produces an empty filter for an empty query (defaults only)', () => {
    const q = ListBuildsQuery.parse({});
    expect(buildFilter(q)).toEqual({});
    expect(q.page).toBe(1);
    expect(q.pageSize).toBe(25);
    expect(q.sort).toBe('-startedAt');
  });

  it('caps pageSize and rejects page 0', () => {
    expect(() => ListBuildsQuery.parse({ pageSize: 1000 })).toThrow();
    expect(() => ListBuildsQuery.parse({ page: 0 })).toThrow();
  });
});
