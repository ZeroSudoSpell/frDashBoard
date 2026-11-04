import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from './lib/api';
import { SummaryTiles } from './components/SummaryTiles';
import { ReleaseHistogram } from './components/ReleaseHistogram';
import { NodeLoadChart } from './components/NodeLoadChart';
import { BuildsTable } from './components/BuildsTable';

type Theme = 'light' | 'dark' | 'system';

function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      return (localStorage.getItem('theme') as Theme) || 'system';
    } catch {
      return 'system';
    }
  });
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('theme', theme);
    } catch {
      /* private mode */
    }
  }, [theme]);
  return [theme, setTheme];
}

export function App() {
  const [project, setProject] = useState<string | undefined>(undefined);
  const [theme, setTheme] = useTheme();
  const projects = useQuery({ queryKey: ['projects'], queryFn: api.projects });

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <h1>Firmware Release Dashboard</h1>
          <div className="sub">CI builds, promotions, and fleet load across all product lines</div>
        </div>
        <div className="topbar-actions">
          <a href="/api/docs" target="_blank" rel="noreferrer" className="btn sm">
            API docs
          </a>
          <div className="seg" role="group" aria-label="Theme">
            {(['light', 'system', 'dark'] as const).map((t) => (
              <button key={t} aria-pressed={theme === t} onClick={() => setTheme(t)}>
                {t}
              </button>
            ))}
          </div>
        </div>
      </header>

      <SummaryTiles />

      <div className="grid-charts">
        <ReleaseHistogram project={project} />
        <NodeLoadChart />
      </div>

      <BuildsTable projects={projects.data ?? []} project={project} onProjectChange={setProject} />
    </div>
  );
}
