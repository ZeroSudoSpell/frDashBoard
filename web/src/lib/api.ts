import type {
  ApiError,
  Build,
  BuildFilters,
  HistogramBucket,
  HistogramRange,
  NodeLoad,
  Paginated,
  Project,
  Release,
  ReleaseStage,
  Summary,
} from './types';

/** Thrown for any non-2xx response, carrying the API's structured error body. */
export class ApiRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: ApiError,
  ) {
    super(body.error);
    this.name = 'ApiRequestError';
  }
}

const BASE = import.meta.env.VITE_API_BASE ?? '';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  });
  if (!res.ok) {
    let body: ApiError = { error: res.statusText };
    try {
      body = (await res.json()) as ApiError;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiRequestError(res.status, body);
  }
  return (await res.json()) as T;
}

/** Build a query string, dropping undefined/empty values. */
function qs(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export const api = {
  projects: () => request<Project[]>('/api/projects'),

  builds: (f: BuildFilters) => request<Paginated<Build>>(`/api/builds${qs({ ...f })}`),

  releases: (params: { project?: string; stage?: string; page?: number; pageSize?: number }) =>
    request<Paginated<Release>>(`/api/releases${qs(params)}`),

  promote: (body: { buildId: string; toStage: ReleaseStage; publishedBy: string; notes?: string }) =>
    request<Release>('/api/releases/promote', { method: 'POST', body: JSON.stringify(body) }),

  summary: () => request<Summary>('/api/analytics/summary'),

  releaseHistogram: (range: HistogramRange, project?: string) =>
    request<HistogramBucket[]>(`/api/analytics/release-histogram${qs({ range, project })}`),

  nodeLoad: () => request<NodeLoad[]>('/api/analytics/node-load'),
};
