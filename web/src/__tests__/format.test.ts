import { formatBucketLabel, formatDuration, formatPercent } from '../lib/format';

describe('formatDuration', () => {
  it('renders seconds, minutes and hours', () => {
    expect(formatDuration(0)).toBe('—');
    expect(formatDuration(45)).toBe('45s');
    expect(formatDuration(125)).toBe('2m 5s');
    expect(formatDuration(3_900)).toBe('1h 5m');
  });
});

describe('formatPercent', () => {
  it('rounds a ratio to a whole percent', () => {
    expect(formatPercent(0.8571)).toBe('86%');
    expect(formatPercent(0)).toBe('0%');
  });
});

describe('formatBucketLabel', () => {
  it('uses month/year for monthly buckets and month/day otherwise', () => {
    expect(formatBucketLabel('2026-10-01', 'month')).toMatch(/Oct/);
    expect(formatBucketLabel('2026-10-27', 'week')).toMatch(/Oct 27/);
  });
});
