import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { formatDuration, formatPercent } from '../lib/format';

function Tile({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: 'good' | 'text' }) {
  return (
    <div className="card tile">
      <div className="label">{label}</div>
      <div className={`value ${tone ?? ''}`}>{value}</div>
      {hint && <div className="hint">{hint}</div>}
    </div>
  );
}

export function SummaryTiles() {
  const { data, isLoading, isError } = useQuery({ queryKey: ['summary'], queryFn: api.summary, refetchInterval: 30_000 });

  if (isLoading) {
    return (
      <div className="grid-tiles">
        {Array.from({ length: 5 }).map((_, i) => (
          <div className="card tile" key={i}>
            <div className="skeleton" style={{ width: '50%' }} />
            <div className="skeleton" style={{ width: '70%', height: '1.8em', marginTop: 8 }} />
          </div>
        ))}
      </div>
    );
  }
  if (isError || !data) return <div className="card error">Could not load summary.</div>;

  const rate = data.successRateLast30d;
  return (
    <div className="grid-tiles">
      <Tile label="Projects" value={String(data.projects)} />
      <Tile label="Builds · 30d" value={data.buildsLast30d.toLocaleString()} />
      <Tile
        label="Success rate · 30d"
        value={formatPercent(rate)}
        tone={rate >= 0.85 ? 'good' : undefined}
        hint="finished builds only"
      />
      <Tile label="Releases · 30d" value={String(data.releasesLast30d)} hint="alpha / beta / rc / release" />
      <Tile label="Avg build time" value={formatDuration(data.avgDurationSecLast30d)} />
      <Tile
        label="Busiest node"
        tone="text"
        value={data.busiestNode?.node ?? '—'}
        hint={data.busiestNode ? `${data.busiestNode.builds} builds` : undefined}
      />
    </div>
  );
}
