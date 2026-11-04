import { useEffect, useMemo, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { formatDateTime, formatDuration } from '../lib/format';
import { BUILD_STATUSES, STAGES, type Build, type BuildFilters, type BuildSort, type Project } from '../lib/types';
import { PromoteDialog } from './PromoteDialog';

const STATUS_ICON: Record<Build['status'], string> = {
  success: '●',
  failed: '✕',
  aborted: '■',
  running: '◐',
  queued: '○',
};

function StatusCell({ status }: { status: Build['status'] }) {
  return (
    <span className={`status status-${status}`}>
      <span className="ico" aria-hidden>
        {STATUS_ICON[status]}
      </span>
      {status}
    </span>
  );
}

function StageBadge({ stage }: { stage: Build['stage'] }) {
  return (
    <span className={`badge stage-${stage}`}>
      <span className="dot" aria-hidden />
      {stage}
    </span>
  );
}

/** Debounce a value so typing in the search box doesn't fire a request per keystroke. */
function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function BuildsTable({
  projects,
  project,
  onProjectChange,
}: {
  projects: Project[];
  project?: string;
  onProjectChange: (p: string | undefined) => void;
}) {
  const [filters, setFilters] = useState<Omit<BuildFilters, 'project' | 'search'>>({
    sort: '-startedAt',
    page: 1,
    pageSize: 25,
  });
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search, 300);
  const [promoting, setPromoting] = useState<Build | null>(null);

  const query: BuildFilters = useMemo(
    () => ({ ...filters, project, search: debouncedSearch || undefined }),
    [filters, project, debouncedSearch],
  );

  // Reset to page 1 whenever a filter other than page changes.
  useEffect(() => {
    setFilters((f) => ({ ...f, page: 1 }));
  }, [project, debouncedSearch, filters.stage, filters.status, filters.sort, filters.board]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['builds', query],
    queryFn: () => api.builds(query),
    placeholderData: keepPreviousData,
  });

  const selectedProject = projects.find((p) => p.name === project);

  function toggleSort(field: 'startedAt' | 'durationSec' | 'version') {
    setFilters((f) => {
      const desc = `-${field}` as BuildSort;
      const asc = field as BuildSort;
      return { ...f, sort: f.sort === desc ? asc : desc };
    });
  }
  const sortIndicator = (field: string) => (filters.sort === `-${field}` ? ' ↓' : filters.sort === field ? ' ↑' : '');

  return (
    <div className="card">
      <div className="card-head">
        <div>
          <h3 className="card-title">Builds</h3>
          <div className="card-sub">
            {data ? `${data.total.toLocaleString()} matching` : ' '}
            {isFetching && !isLoading ? ' · refreshing…' : ''}
          </div>
        </div>
      </div>

      <div className="filters" role="search">
        <select aria-label="Project" value={project ?? ''} onChange={(e) => onProjectChange(e.target.value || undefined)}>
          <option value="">All projects</option>
          {projects.map((p) => (
            <option key={p._id} value={p.name}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Board"
          value={filters.board ?? ''}
          disabled={!selectedProject}
          onChange={(e) => setFilters((f) => ({ ...f, board: e.target.value || undefined }))}
        >
          <option value="">All boards</option>
          {selectedProject?.boards.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        <select aria-label="Stage" value={filters.stage ?? ''} onChange={(e) => setFilters((f) => ({ ...f, stage: (e.target.value || undefined) as BuildFilters['stage'] }))}>
          <option value="">All stages</option>
          {STAGES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select aria-label="Status" value={filters.status ?? ''} onChange={(e) => setFilters((f) => ({ ...f, status: (e.target.value || undefined) as BuildFilters['status'] }))}>
          <option value="">All statuses</option>
          {BUILD_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <span className="spacer" />
        <input type="search" aria-label="Search" placeholder="Search version, node, project…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Project</th>
              <th>Branch / board</th>
              <th className="sortable" onClick={() => toggleSort('version')}>
                Version{sortIndicator('version')}
              </th>
              <th>Stage</th>
              <th>Status</th>
              <th>Node</th>
              <th className="sortable" onClick={() => toggleSort('durationSec')}>
                Duration{sortIndicator('durationSec')}
              </th>
              <th className="sortable" onClick={() => toggleSort('startedAt')}>
                Started{sortIndicator('startedAt')}
              </th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={9} className="empty">
                  Loading…
                </td>
              </tr>
            ) : !data || data.items.length === 0 ? (
              <tr>
                <td colSpan={9} className="empty">
                  No builds match these filters.
                </td>
              </tr>
            ) : (
              data.items.map((b) => (
                <tr key={b._id}>
                  <td>{b.project}</td>
                  <td>
                    <span className="mono">{b.branch}</span> <span style={{ color: 'var(--muted)' }}>/</span> {b.board}
                  </td>
                  <td className="mono">
                    {b.version} <span style={{ color: 'var(--muted)' }}>#{b.jenkinsBuildNumber}</span>
                  </td>
                  <td>
                    <StageBadge stage={b.stage} />
                  </td>
                  <td>
                    <StatusCell status={b.status} />
                  </td>
                  <td className="mono">{b.node}</td>
                  <td className="num">{formatDuration(b.durationSec)}</td>
                  <td className="num">{formatDateTime(b.startedAt)}</td>
                  <td>
                    {b.status === 'success' && b.stage !== 'release' && (
                      <button className="btn sm" onClick={() => setPromoting(b)}>
                        Promote
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {data && data.totalPages > 1 && (
        <div className="pager">
          <span>
            Page {data.page} of {data.totalPages}
          </span>
          <div className="controls">
            <button className="btn sm" disabled={data.page <= 1} onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}>
              ‹ Prev
            </button>
            <button className="btn sm" disabled={data.page >= data.totalPages} onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}>
              Next ›
            </button>
          </div>
        </div>
      )}

      {promoting && <PromoteDialog build={promoting} onClose={() => setPromoting(null)} />}
    </div>
  );
}
