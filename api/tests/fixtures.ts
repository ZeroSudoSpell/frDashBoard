import { Project } from '../src/models/Project.js';
import { Build } from '../src/models/Build.js';
import type { BuildStatus, Stage } from '../src/domain.js';

export async function seedProject(overrides: Partial<{ name: string; boards: string[]; branches: string[] }> = {}) {
  return Project.create({
    name: overrides.name ?? 'Matrix-Switcher-8x8',
    codename: 'orion',
    partNumber: `60-${Math.floor(Math.random() * 9000 + 1000)}-01`,
    boards: overrides.boards ?? ['main', 'io-expander'],
    branches: overrides.branches ?? ['main'],
  });
}

let buildCounter = 1000;
export async function seedBuild(
  overrides: Partial<{
    project: string;
    branch: string;
    board: string;
    version: string;
    stage: Stage;
    status: BuildStatus;
    node: string;
    durationSec: number;
    startedAt: Date;
  }> = {},
) {
  buildCounter += 1;
  return Build.create({
    project: overrides.project ?? 'Matrix-Switcher-8x8',
    branch: overrides.branch ?? 'main',
    board: overrides.board ?? 'main',
    version: overrides.version ?? '3.01.0001',
    stage: overrides.stage ?? 'nightly',
    status: overrides.status ?? 'success',
    node: overrides.node ?? 'build01',
    jenkinsBuildNumber: buildCounter,
    durationSec: overrides.durationSec ?? 600,
    startedAt: overrides.startedAt ?? new Date(),
    finishedAt: new Date(),
  });
}
