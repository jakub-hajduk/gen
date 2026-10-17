import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { loadConfig } from 'c12';
import type { SnipoConfig } from './define-config';
import { discoverGenerators, type DiscoveredGenerator } from './discover-generators';

const CONFIG_BASENAME = 'snipo.config';
const CONFIG_EXTENSIONS = [
  '.ts',
  '.mts',
  '.cts',
  '.js',
  '.mjs',
  '.cjs',
  '.json',
  '.jsonc',
  '.json5',
  '.yaml',
  '.yml',
  '.toml',
];

const WORKSPACE_MARKERS = ['pnpm-workspace.yaml', 'pnpm-workspace.yml', 'lerna.json', 'rush.json'];

export interface LoadedConfig {
  config: SnipoConfig;
  generators: DiscoveredGenerator[];
  configPath: string;
  configDir: string;
  boundary: string;
}

function declarationError(configPath: string): Error {
  return new Error(
    `Invalid snipo configuration at ${configPath}: expected a default export whose "generators" is an array of glob patterns (strings).`,
  );
}

function isWorkspaceRoot(dir: string): boolean {
  if (WORKSPACE_MARKERS.some((marker) => existsSync(join(dir, marker)))) {
    return true;
  }

  const packageJsonPath = join(dir, 'package.json');
  if (!existsSync(packageJsonPath)) return false;

  try {
    const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
      workspaces?: unknown;
    };
    return pkg.workspaces !== undefined;
  } catch {
    return false;
  }
}

export function findProjectBoundary(cwd: string = process.cwd()): string {
  const start = resolve(cwd);
  let dir = start;
  let packageBoundary: string | undefined;

  while (true) {
    if (isWorkspaceRoot(dir)) return dir;
    if (packageBoundary === undefined && existsSync(join(dir, 'package.json'))) {
      packageBoundary = dir;
    }

    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  return packageBoundary ?? start;
}

function searchAncestors(cwd: string, boundary: string): string[] {
  const dirs: string[] = [];
  const start = resolve(cwd);
  const stop = resolve(boundary);
  let dir = start;

  while (true) {
    dirs.push(dir);
    if (dir === stop) break;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  return dirs;
}

export function findNearestConfig(
  cwd: string = process.cwd(),
  boundary: string = findProjectBoundary(cwd),
): string | undefined {
  for (const dir of searchAncestors(cwd, boundary)) {
    for (const extension of CONFIG_EXTENSIONS) {
      const candidate = join(dir, `${CONFIG_BASENAME}${extension}`);
      if (existsSync(candidate)) return candidate;
    }
  }

  return undefined;
}

export async function loadSnipoConfig(cwd: string = process.cwd()): Promise<LoadedConfig> {
  const boundary = findProjectBoundary(cwd);
  const configPath = findNearestConfig(cwd, boundary);

  if (!configPath) {
    throw new Error(
      `No ${CONFIG_BASENAME}.* found from ${resolve(cwd)} up to the project boundary at ${boundary}. Create a ${CONFIG_BASENAME}.ts that exports defineConfig({ generators: [...] }).`,
    );
  }

  const configDir = dirname(configPath);
  let config: SnipoConfig;

  try {
    const loaded = await loadConfig<SnipoConfig>({
      name: 'snipo',
      cwd: configDir,
      configFile: CONFIG_BASENAME,
      rcFile: false,
      globalRc: false,
      dotenv: false,
      packageJson: false,
      configFileRequired: true,
    });
    config = loaded.config;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to load snipo configuration at ${configPath}: ${message}`);
  }

  if (!config || !Array.isArray(config.generators)) {
    throw declarationError(configPath);
  }

  const invalidEntry = config.generators.find((entry) => typeof entry !== 'string');
  if (invalidEntry !== undefined) {
    throw new Error(
      `Invalid snipo configuration at ${configPath}: "generators" must be an array of glob patterns (strings), but it contains a ${typeof invalidEntry}. Move each inline generator into its own file and reference it with a glob.`,
    );
  }

  const generators = await discoverGenerators({ configDir, patterns: config.generators });

  return { config, generators, configPath, configDir, boundary };
}
