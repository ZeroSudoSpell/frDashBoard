import { canPromote, stageIndex, STAGES } from '../../src/domain.js';

describe('promotion lifecycle', () => {
  it('orders stages nightly -> weekly -> alpha -> beta -> rc -> release', () => {
    expect(STAGES).toEqual(['nightly', 'weekly', 'alpha', 'beta', 'rc', 'release']);
    expect(stageIndex('release')).toBeGreaterThan(stageIndex('rc'));
  });

  it('only allows forward promotion', () => {
    expect(canPromote('nightly', 'alpha')).toBe(true);
    expect(canPromote('alpha', 'release')).toBe(true);
    expect(canPromote('beta', 'alpha')).toBe(false);
    expect(canPromote('rc', 'rc')).toBe(false);
  });
});
