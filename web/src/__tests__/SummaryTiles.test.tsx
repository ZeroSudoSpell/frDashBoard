import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import { SummaryTiles } from '../components/SummaryTiles';
import type { Summary } from '../lib/types';

const summary: Summary = {
  projects: 8,
  buildsLast30d: 1234,
  successRateLast30d: 0.91,
  releasesLast30d: 17,
  avgDurationSecLast30d: 1500,
  busiestNode: { node: 'build09-cloud', builds: 300 },
};

function renderWithClient(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe('SummaryTiles', () => {
  it('renders headline numbers from the API', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(summary), { status: 200 })));
    renderWithClient(<SummaryTiles />);
    expect(await screen.findByText('1,234')).toBeInTheDocument();
    expect(screen.getByText('91%')).toBeInTheDocument();
    expect(screen.getByText('25m 0s')).toBeInTheDocument();
    expect(screen.getByText('build09-cloud')).toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  it('shows an error state when the API fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'boom' }), { status: 500 })));
    renderWithClient(<SummaryTiles />);
    expect(await screen.findByText(/Could not load summary/)).toBeInTheDocument();
    vi.unstubAllGlobals();
  });
});
