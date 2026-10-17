import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { test } from 'node:test';

const distDir = fileURLToPath(new URL('../../dist/', import.meta.url));

const RUNTIME_ENGINES = [
  '@clack/prompts',
  'c12',
  'eta',
  'hookable',
  'jiti',
  'tinyglobby',
  'typescript',
  'writepool',
];

function readDist(name: string): string | undefined {
  try {
    return readFileSync(join(distDir, name), 'utf8');
  } catch {
    return undefined;
  }
}

test('the root entry does not load a runtime engine', (t) => {
  const source = readDist('index.mjs');
  if (source === undefined) {
    t.skip('dist/index.mjs is not built');
    return;
  }

  for (const engine of RUNTIME_ENGINES) {
    assert.equal(source.includes(engine), false, `root entry references "${engine}"`);
  }
});

test('only the CLI entry imports the interactive prompt adapter', (t) => {
  if (readDist('runtime.mjs') === undefined) {
    t.skip('dist/runtime.mjs is not built');
    return;
  }

  const entries = readdirSync(distDir).filter((name) => name.endsWith('.mjs'));
  const withClack = entries.filter((name) =>
    readFileSync(join(distDir, name), 'utf8').includes('@clack/prompts'),
  );

  assert.deepEqual(withClack, ['cli.mjs']);
});
