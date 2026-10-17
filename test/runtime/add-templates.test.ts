import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

import { addTemplates } from '../../src/actions/index';
import type { Generator } from '../../src/config/define-generator';
import { text } from '../../src/prompts/index';
import { runGenerator } from '../../src/runtime/run-generator';
import { makeTempDir, writeFile } from '../helpers/fixtures';

function makeGenerator(actions: Generator['actions']): Generator {
  return {
    name: 'component',
    basePath: 'src',
    prompts: { name: text({ message: 'Name' }) },
    actions,
  };
}

test('recursively stages nested templates and strips the final .eta extension', async () => {
  const configDir = makeTempDir();
  writeFile(
    join(configDir, 'templates', '{pascalCase:name}.tsx.eta'),
    'export const <%= it.answers.name %> = 1;\n',
  );
  writeFile(
    join(configDir, 'templates', 'nested', '{kebabCase:name}', 'index.ts.eta'),
    'export const kind = "<%= it.format.kebabCase(it.answers.name) %>";\n',
  );

  const result = await runGenerator({
    generator: makeGenerator([addTemplates({ from: 'templates', to: 'components' })]),
    configDir,
    answers: { name: 'User Profile' },
  });

  const componentFile = join(configDir, 'src', 'components', 'UserProfile.tsx');
  const nestedFile = join(configDir, 'src', 'components', 'nested', 'user-profile', 'index.ts');

  assert.equal(existsSync(componentFile), true);
  assert.equal(existsSync(nestedFile), true);
  assert.equal(readFileSync(componentFile, 'utf8'), 'export const User Profile = 1;\n');
  assert.equal(readFileSync(nestedFile, 'utf8'), 'export const kind = "user-profile";\n');
  assert.deepEqual(result.files.sort(), [componentFile, nestedFile].sort());
});

test('copies non-template files verbatim', async () => {
  const configDir = makeTempDir();
  writeFile(join(configDir, 'templates', 'asset.txt'), 'plain contents');

  await runGenerator({
    generator: makeGenerator([addTemplates({ from: 'templates', to: 'assets' })]),
    configDir,
    answers: { name: 'Asset' },
  });

  assert.equal(
    readFileSync(join(configDir, 'src', 'assets', 'asset.txt'), 'utf8'),
    'plain contents',
  );
});

test('reads templates from the generator module directory', async () => {
  const configDir = makeTempDir();
  const moduleDir = join(configDir, 'generators');
  writeFile(
    join(moduleDir, 'templates', 'hello.ts.eta'),
    'export const name = "<%= it.answers.name %>";\n',
  );

  await runGenerator({
    generator: makeGenerator([addTemplates({ from: 'templates', to: 'out' })]),
    configDir,
    moduleDir,
    answers: { name: 'Module Local' },
  });

  assert.equal(
    readFileSync(join(configDir, 'src', 'out', 'hello.ts'), 'utf8'),
    'export const name = "Module Local";\n',
  );
});

test('keeps outputs anchored to the config directory when templates live elsewhere', async () => {
  const configDir = makeTempDir();
  const moduleDir = makeTempDir();
  writeFile(join(moduleDir, 'templates', 'asset.txt'), 'elsewhere');

  const result = await runGenerator({
    generator: makeGenerator([addTemplates({ from: 'templates', to: 'assets' })]),
    configDir,
    moduleDir,
    answers: { name: 'Asset' },
  });

  const output = join(configDir, 'src', 'assets', 'asset.txt');
  assert.equal(readFileSync(output, 'utf8'), 'elsewhere');
  assert.equal(result.basePath, join(configDir, 'src'));
  assert.deepEqual(result.files, [output]);
});
