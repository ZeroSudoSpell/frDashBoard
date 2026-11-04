import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipProps } from 'recharts';
import { api } from '../lib/api';
import { formatBucketLabel } from '../lib/format';
import type { HistogramBucket, HistogramRange, ReleaseStage } from '../lib/types';

const SERIES: Array<{ key: ReleaseStage; label: string; color: string }> = [
  { key: 'alpha', label: 'Alpha', color: 'var(--series-1)' },
  { key: 'beta', label: 'Beta', color: 'var(--series-2)' },
  { key: 'rc', label: 'RC', color: 'var(--series-3)' },
  { key: 'release', label: 'Release', color: 'var(--series-4)' },
];

const RANGE_LABEL: Record<HistogramRange, string> = { day: 'Last 10 days', week: 'Last 5 weeks', month: 'Last 6 months' };

function HistTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const row = payload[0]!.payload as HistogramBucket & { label: string };
  return (
    <div className="tip">
      <div className="tip-title">{label}</div>
      {SERIES.map((s) => (
        <div className="row" key={s.key}>
          <span>
            <span className="swatch" style={{ background: s.color, marginRight: 6 }} />
            {s.label}
          </span>
          <b>{row[s.key]}</b>
        </div>
      ))}
      <div className="row" style={{ marginTop: 4 }}>
        <span>Total</span>
        <b>{row.total}</b>
      </div>
    </div>
  );
}

export function ReleaseHistogram({ project }: { project?: string }) {
  const [range, setRange] = useState<HistogramRange>('week');
  const { data, isLoading } = useQuery({
    queryKey: ['release-histogram', range, project],
    queryFn: () => api.releaseHistogram(range, project),
  });

  const rows = (data ?? []).map((b) => ({ ...b, label: formatBucketLabel(b.bucket, range) }));

  return (
    <div className="card">
      <div className="card-head">
        <div>
          <h3 className="card-title">Release history</h3>
          <div className="card-sub">{RANGE_LABEL[range]} · promotions by stage</div>
        </div>
        <div className="seg" role="group" aria-label="Range">
          {(['day', 'week', 'month'] as const).map((r) => (
            <button key={r} aria-pressed={range === r} onClick={() => setRange(r)}>
              {r[0]!.toUpperCase() + r.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div style={{ height: 240 }}>
        {isLoading ? (
          <div className="skeleton" style={{ height: '100%' }} />
        ) : rows.length === 0 ? (
          <div className="empty">No releases in this range.</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 8, right: 8, left: -16, bottom: 0 }} barCategoryGap="30%">
              <CartesianGrid vertical={false} stroke="var(--grid)" />
              <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: 'var(--axis)' }} tick={{ fill: 'var(--muted)', fontSize: 11 }} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} />
              <Tooltip content={<HistTooltip />} cursor={{ fill: 'var(--surface-2)' }} />
              {SERIES.map((s, i) => (
                <Bar
                  key={s.key}
                  dataKey={s.key}
                  stackId="stage"
                  fill={s.color}
                  stroke="var(--surface)"
                  strokeWidth={2}
                  radius={i === SERIES.length - 1 ? [4, 4, 0, 0] : 0}
                  isAnimationActive={false}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <ul className="legend" aria-label="Legend">
        {SERIES.map((s) => (
          <li key={s.key}>
            <span className="swatch" style={{ background: s.color }} />
            {s.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
