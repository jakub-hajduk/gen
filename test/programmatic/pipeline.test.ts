import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import { loadSnipoConfig, resolveGenerator, runGenerator } from '../../src/runtime';
import { createFakeAdapter } from '../helpers/fake-adapter';
import { makeTempDir, writeFile } from '../helpers/fixtures';

const srcEntry = join(fileURLToPath(new URL('../../', import.meta.url)), 'src', 'index.ts');

function makeProject(): string {
  const dir = makeTempDir('snipo-pipeline-');
  writeFile(join(dir, 'package.json'), JSON.stringify({ name: 'fixture', version: '0.0.0' }));
  writeFile(
    join(dir, 'snipo.config.ts'),
    "export default { generators: ['./generators/*.ts'] };\n",
  );

  const modulePath = join(dir, 'generators', 'component.ts');
  const specifier = relative(dirname(modulePath), srcEntry);
  writeFile(
    modulePath,
    `import { addTemplates, defineGenerator } from ${JSON.stringify(specifier)};\n` +
      "export default defineGenerator({ name: 'component', basePath: 'src', actions: [addTemplates({ from: 'templates', to: '.' })] });\n",
  );
  writeFile(
    join(dir, 'generators', 'templates', 'component.ts.eta'),
    'export const component = true;\n',
  );

  return dir;
}

test('load, resolve by name, and run through the public runtime exports', async () => {
  const dir = makeProject();

  const loaded = await loadSnipoConfig(dir);
  const resolved = await resolveGenerator({
    generators: loaded.generators,
    name: 'component',
    prompts: createFakeAdapter(),
  });

  const result = await runGenerator({
    generator: resolved.generator,
    configDir: loaded.configDir,
    moduleDir: resolved.moduleDir,
    answers: {},
  });

  assert.deepEqual(result.files, [join(dir, 'src', 'component.ts')]);
  assert.equal(
    readFileSync(join(dir, 'src', 'component.ts'), 'utf8'),
    'export const component = true;\n',
  );
});

test('an unknown generator name fails and lists the available names', async () => {
  const dir = makeProject();
  const loaded = await loadSnipoConfig(dir);

  await assert.rejects(
    resolveGenerator({
      generators: loaded.generators,
      name: 'missing',
      prompts: createFakeAdapter(),
    }),
    /Unknown generator "missing"\. Available generators: component\./,
  );
});
