import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

import { addTemplates, defineGenerator } from '../../src/index';
import { runGenerator } from '../../src/runtime';
import { makeTempDir, writeFile } from '../helpers/fixtures';

function makeModuleDir(): string {
  const moduleDir = makeTempDir('snipo-module-');
  writeFile(
    join(moduleDir, 'templates', 'widget.ts.eta'),
    'export const <%= it.answers.name %> = true;\n',
  );
  return moduleDir;
}

test('a code-defined generator runs without a snipo.config file', async () => {
  const configDir = makeTempDir('snipo-target-');
  const moduleDir = makeModuleDir();

  assert.equal(existsSync(join(configDir, 'snipo.config.ts')), false);

  const result = await runGenerator({
    generator: defineGenerator({
      name: 'widget',
      basePath: 'src',
      actions: [addTemplates({ from: 'templates', to: '.' })],
    }),
    configDir,
    moduleDir,
    answers: { name: 'Widget' },
  });

  assert.deepEqual(result.files, [join(configDir, 'src', 'widget.ts')]);
  assert.equal(result.written, true);
  assert.equal(
    readFileSync(join(configDir, 'src', 'widget.ts'), 'utf8'),
    'export const Widget = true;\n',
  );
});

test('a dry run returns the staged list and writes nothing', async () => {
  const configDir = makeTempDir('snipo-target-');
  const moduleDir = makeModuleDir();

  const result = await runGenerator({
    generator: defineGenerator({
      name: 'widget',
      basePath: 'src',
      actions: [addTemplates({ from: 'templates', to: '.' })],
    }),
    configDir,
    moduleDir,
    answers: { name: 'Widget' },
    dryRun: true,
  });

  assert.deepEqual(result.files, [join(configDir, 'src', 'widget.ts')]);
  assert.equal(result.written, false);
  assert.equal(existsSync(join(configDir, 'src', 'widget.ts')), false);
});
