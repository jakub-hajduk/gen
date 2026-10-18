import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import { runCli } from '../../src/cli/run';
import { createFakeAdapter } from '../helpers/fake-adapter';
import { runCliProcess } from '../helpers/run-cli';

const repoRoot = fileURLToPath(new URL('../../', import.meta.url));
const srcEntry = join(repoRoot, 'src', 'index.ts');

function writeFile(path: string, contents: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, contents);
}

function writeGenerator(dir: string, name: string): void {
  const file = join(dir, 'generators', `${name}.ts`);
  const specifier = relative(dirname(file), srcEntry);
  writeFile(
    file,
    `import { defineGenerator } from ${JSON.stringify(specifier)};\nexport default defineGenerator({ name: '${name}', basePath: 'src', actions: [] });\n`,
  );
}

function makeProject(): string {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'gen-fixture-')));
  writeFile(join(dir, 'package.json'), JSON.stringify({ name: 'fixture', version: '0.0.0' }));
  writeFile(join(dir, 'gen.config.ts'), "export default { generators: ['./generators/*.ts'] };\n");
  writeGenerator(dir, 'alpha');
  writeGenerator(dir, 'beta');
  return dir;
}

test('a named generator runs non-interactively', async () => {
  const dir = makeProject();
  const result = await runCliProcess(['alpha'], dir);

  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /Generator "alpha" wrote 0 file\(s\)\./);
});

test('non-interactive selection without a name fails and lists generators', async () => {
  const dir = makeProject();
  const result = await runCliProcess([], dir);

  assert.equal(result.code, 1);
  assert.match(result.stderr, /No generator selected/);
  assert.match(result.stderr, /alpha, beta/);
});

test('an unknown generator name fails with the available list', async () => {
  const dir = makeProject();
  const result = await runCliProcess(['gamma'], dir);

  assert.equal(result.code, 1);
  assert.match(result.stderr, /Unknown generator "gamma"/);
  assert.match(result.stderr, /alpha, beta/);
});

test('an interactive terminal can select a generator', async () => {
  const dir = makeProject();
  const adapter = createFakeAdapter({ interactive: true, generator: 'beta' });

  const result = await runCli([], { cwd: dir, adapter });

  assert.equal(result.kind, 'run');
  assert.equal(result.generator, 'beta');
  const selection = adapter.calls.find((call) => call.method === 'selectGenerator');
  assert.ok(selection);
});
