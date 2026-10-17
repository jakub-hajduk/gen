import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import { discoverGenerators } from '../../src/config/discover-generators';

const repoRoot = fileURLToPath(new URL('../../', import.meta.url));
const srcEntry = join(repoRoot, 'src', 'index.ts');

function tempDir(): string {
  return realpathSync(mkdtempSync(join(tmpdir(), 'snipkit-discover-')));
}

function writeModule(dir: string, relativePath: string, body: string): string {
  const file = join(dir, relativePath);
  mkdirSync(dirname(file), { recursive: true });
  const specifier = relative(dirname(file), srcEntry);
  writeFileSync(file, `import { defineGenerator } from ${JSON.stringify(specifier)};\n${body}\n`);
  return file;
}

const generator = (name: string) =>
  `defineGenerator({ name: '${name}', basePath: 'src', actions: [] })`;

test('glob expansion is ordered by glob then sorted path', async () => {
  const dir = tempDir();
  writeModule(dir, 'generators/b.generator.ts', `export default ${generator('b')};`);
  writeModule(dir, 'generators/a.generator.ts', `export default ${generator('a')};`);

  const discovered = await discoverGenerators({
    configDir: dir,
    patterns: ['./generators/**/*.generator.ts'],
  });

  assert.deepEqual(
    discovered.map((entry) => entry.generator.name),
    ['a', 'b'],
  );
  assert.equal(discovered[0]?.moduleDir, join(dir, 'generators'));
});

test('flattens default arrays, named exports, plugin objects, and nested shapes', async () => {
  const dir = tempDir();
  writeModule(dir, 'generators/array.ts', `export default [${generator('a')}, ${generator('b')}];`);
  writeModule(dir, 'generators/named.ts', `export const c = ${generator('c')};`);
  writeModule(dir, 'generators/plugin.ts', `export default { generators: [${generator('d')}] };`);
  writeModule(
    dir,
    'generators/nested.ts',
    `export default [[${generator('e')}], { generators: [${generator('f')}] }];`,
  );

  const discovered = await discoverGenerators({
    configDir: dir,
    patterns: ['./generators/*.ts'],
  });

  assert.deepEqual(discovered.map((entry) => entry.generator.name).sort(), [
    'a',
    'b',
    'c',
    'd',
    'e',
    'f',
  ]);
});

test('ignores matched files that export no generator', async () => {
  const dir = tempDir();
  writeModule(
    dir,
    'generators/helper.ts',
    `export const helper = 1;\nexport const value = { foo: 'bar' };`,
  );
  writeModule(dir, 'generators/real.ts', `export default ${generator('real')};`);

  const discovered = await discoverGenerators({
    configDir: dir,
    patterns: ['./generators/*.ts'],
  });

  assert.deepEqual(
    discovered.map((entry) => entry.generator.name),
    ['real'],
  );
});

test('deduplicates the same generator reached through a re-export', async () => {
  const dir = tempDir();
  writeModule(dir, 'generators/a.ts', `export const a = ${generator('a')};`);
  writeModule(dir, 'generators/all.ts', `export * from './a';`);

  const discovered = await discoverGenerators({
    configDir: dir,
    patterns: ['./generators/*.ts'],
  });

  assert.deepEqual(
    discovered.map((entry) => entry.generator.name),
    ['a'],
  );
});

test('fails when two distinct generators share a name', async () => {
  const dir = tempDir();
  const first = writeModule(dir, 'generators/one.ts', `export default ${generator('component')};`);
  const second = writeModule(dir, 'generators/two.ts', `export default ${generator('component')};`);

  await assert.rejects(
    discoverGenerators({ configDir: dir, patterns: ['./generators/*.ts'] }),
    (error: Error) => {
      assert.match(error.message, /Duplicate generator name "component"/);
      assert.ok(error.message.includes(first));
      assert.ok(error.message.includes(second));
      return true;
    },
  );
});
