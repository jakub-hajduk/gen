import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

import { addTemplates } from '../../src/actions/index';
import type { Generator } from '../../src/config/define-generator';
import { text } from '../../src/prompts/index';
import { runGenerator } from '../../src/runtime/run-generator';
import { makeTempDir, writeFile } from '../helpers/fixtures';

function makeGenerator(to: string): Generator {
  return {
    name: 'component',
    basePath: 'src',
    prompts: { name: text({ message: 'Name' }) },
    actions: [addTemplates({ from: 'templates', to })],
  };
}

test('a rendered path that escapes the base path is rejected', async () => {
  const configDir = makeTempDir();
  writeFile(join(configDir, 'templates', '{name}.txt'), 'contents');

  await assert.rejects(
    runGenerator({
      generator: makeGenerator('components'),
      configDir,
      answers: { name: '../../escaped' },
    }),
    /escapes the generator base path/,
  );

  assert.equal(existsSync(join(configDir, 'escaped.txt')), false);
});

test('a destination that escapes the base path is rejected before writing', async () => {
  const configDir = makeTempDir();
  writeFile(join(configDir, 'templates', 'index.ts.eta'), 'x');

  await assert.rejects(
    runGenerator({
      generator: makeGenerator('../outside'),
      configDir,
      answers: { name: 'Thing' },
    }),
    /escapes the generator base path/,
  );

  assert.equal(existsSync(join(configDir, 'outside', 'index.ts')), false);
});

test('dry run reports planned files but leaves the filesystem unchanged', async () => {
  const configDir = makeTempDir();
  writeFile(join(configDir, 'templates', 'index.ts.eta'), 'export {};\n');

  const result = await runGenerator({
    generator: makeGenerator('components'),
    configDir,
    answers: { name: 'Thing' },
    dryRun: true,
  });

  assert.equal(result.written, false);
  assert.equal(result.files.length, 1);
  assert.equal(existsSync(join(configDir, 'src', 'components', 'index.ts')), false);
});

test('an existing file collides and fails without force', async () => {
  const configDir = makeTempDir();
  writeFile(join(configDir, 'templates', 'index.ts.eta'), 'new contents');
  writeFile(join(configDir, 'src', 'components', 'index.ts'), 'existing');

  await assert.rejects(
    runGenerator({
      generator: makeGenerator('components'),
      configDir,
      answers: { name: 'Thing' },
    }),
    /Refusing to overwrite existing file/,
  );

  assert.equal(readFileSync(join(configDir, 'src', 'components', 'index.ts'), 'utf8'), 'existing');
});

test('force replaces an existing file', async () => {
  const configDir = makeTempDir();
  writeFile(join(configDir, 'templates', 'index.ts.eta'), 'new contents');
  writeFile(join(configDir, 'src', 'components', 'index.ts'), 'existing');

  await runGenerator({
    generator: makeGenerator('components'),
    configDir,
    answers: { name: 'Thing' },
    force: true,
  });

  assert.equal(
    readFileSync(join(configDir, 'src', 'components', 'index.ts'), 'utf8'),
    'new contents',
  );
});
