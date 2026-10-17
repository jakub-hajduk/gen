import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import { findProjectBoundary, loadSnipkitConfig } from '../../src/config/load-config';

const repoRoot = fileURLToPath(new URL('../../', import.meta.url));
const srcEntry = join(repoRoot, 'src', 'index.ts');

function tempDir(): string {
  return realpathSync(mkdtempSync(join(tmpdir(), 'snipkit-config-')));
}

function write(path: string, contents: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, contents);
}

function writeGenerator(dir: string, relativePath: string, name: string): void {
  const file = join(dir, relativePath);
  const specifier = relative(dirname(file), srcEntry);
  write(
    file,
    `import { defineGenerator } from ${JSON.stringify(specifier)};\nexport default defineGenerator({ name: '${name}', basePath: 'src', actions: [] });\n`,
  );
}

test('configuration is inherited from a monorepo root', async () => {
  const root = tempDir();
  const appDir = join(root, 'packages', 'app');

  write(join(root, 'package.json'), JSON.stringify({ name: 'root', private: true }));
  write(join(root, 'pnpm-workspace.yaml'), 'packages:\n  - packages/*\n');
  write(join(root, 'snipkit.config.ts'), "export default { generators: ['./generators/*.ts'] };\n");
  write(join(appDir, 'package.json'), JSON.stringify({ name: 'app' }));
  writeGenerator(root, 'generators/root.ts', 'root');

  const loaded = await loadSnipkitConfig(appDir);

  assert.equal(loaded.configDir, root);
  assert.equal(loaded.boundary, root);
  assert.equal(loaded.configPath, join(root, 'snipkit.config.ts'));
  assert.equal(loaded.generators[0]?.generator.name, 'root');
  assert.equal(loaded.generators[0]?.moduleDir, join(root, 'generators'));
});

test('a package configuration takes precedence over the workspace root', async () => {
  const root = tempDir();
  const appDir = join(root, 'packages', 'app');

  write(join(root, 'package.json'), JSON.stringify({ name: 'root', private: true }));
  write(join(root, 'pnpm-workspace.yaml'), 'packages:\n  - packages/*\n');
  write(join(root, 'snipkit.config.ts'), "export default { generators: ['./generators/*.ts'] };\n");
  write(join(appDir, 'package.json'), JSON.stringify({ name: 'app' }));
  write(
    join(appDir, 'snipkit.config.ts'),
    "export default { generators: ['./generators/*.ts'] };\n",
  );
  writeGenerator(root, 'generators/root.ts', 'root');
  writeGenerator(appDir, 'generators/app.ts', 'app');

  const loaded = await loadSnipkitConfig(appDir);

  assert.equal(loaded.configDir, appDir);
  assert.deepEqual(
    loaded.generators.map((entry) => entry.generator.name),
    ['app'],
  );
});

test('a non-workspace project boundary is the nearest package.json', () => {
  const root = tempDir();
  const nested = join(root, 'src', 'deep');
  write(join(root, 'package.json'), JSON.stringify({ name: 'solo' }));
  mkdirSync(nested, { recursive: true });

  assert.equal(findProjectBoundary(nested), root);
});

test('a non-string generators entry is rejected with an actionable error', async () => {
  const root = tempDir();
  write(join(root, 'package.json'), JSON.stringify({ name: 'solo' }));
  write(join(root, 'snipkit.config.ts'), 'export default { generators: [{ name: "inline" }] };\n');

  await assert.rejects(loadSnipkitConfig(root), /must be an array of glob patterns/);
});

test('a missing configuration produces an actionable error', async () => {
  const root = tempDir();
  write(join(root, 'package.json'), JSON.stringify({ name: 'solo' }));

  await assert.rejects(
    loadSnipkitConfig(root),
    /No snipkit\.config\.\* found from .* up to the project boundary at .*/,
  );
});
