export function formatDuration(sec: number): string {
  if (!sec) return '—';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m >= 60) return `${Math.floor(m / 60)}h ${m % 60}m`;
  return m ? `${m}m ${s}s` : `${s}s`;
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}

export function formatBucketLabel(bucket: string, range: 'day' | 'week' | 'month'): string {
  const d = new Date(`${bucket}T00:00:00Z`);
  if (range === 'month') return d.toLocaleString(undefined, { month: 'short', year: '2-digit', timeZone: 'UTC' });
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });
}
