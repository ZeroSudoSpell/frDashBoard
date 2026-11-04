import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipProps } from 'recharts';
import { api } from '../lib/api';
import { formatDuration } from '../lib/format';
import type { NodeLoad } from '../lib/types';

function NodeTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const n = payload[0]!.payload as NodeLoad;
  return (
    <div className="tip">
      <div className="tip-title">{n.node}</div>
      <div className="row">
        <span>Builds</span>
        <b>{n.builds}</b>
      </div>
      <div className="row">
        <span>Failed</span>
        <b>{n.failed}</b>
      </div>
      <div className="row">
        <span>Avg duration</span>
        <b>{formatDuration(n.avgDurationSec)}</b>
      </div>
    </div>
  );
}

/** Single-series horizontal bars: builds per CI node over the last 30 days. */
export function NodeLoadChart() {
  const { data, isLoading } = useQuery({ queryKey: ['node-load'], queryFn: api.nodeLoad });
  const rows = data ?? [];

  return (
    <div className="card">
      <div className="card-head">
        <div>
          <h3 className="card-title">Build load by node</h3>
          <div className="card-sub">Last 30 days</div>
        </div>
      </div>
      <div style={{ height: 240 }}>
        {isLoading ? (
          <div className="skeleton" style={{ height: '100%' }} />
        ) : rows.length === 0 ? (
          <div className="empty">No builds yet.</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }} barCategoryGap="28%">
              <CartesianGrid horizontal={false} stroke="var(--grid)" />
              <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} />
              <YAxis type="category" dataKey="node" width={92} tickLine={false} axisLine={{ stroke: 'var(--axis)' }} tick={{ fill: 'var(--ink-2)', fontSize: 11 }} />
              <Tooltip content={<NodeTooltip />} cursor={{ fill: 'var(--surface-2)' }} />
              <Bar dataKey="builds" fill="var(--series-1)" radius={[0, 4, 4, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
