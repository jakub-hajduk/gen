import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

import { addTemplates, updateImports } from '../../src/actions/index';
import type { Generator } from '../../src/config/define-generator';
import { runGenerator } from '../../src/runtime/run-generator';
import { makeTempDir, writeFile } from '../helpers/fixtures';

function makeGenerator(actions: Generator['actions']): Generator {
  return { name: 'component', basePath: 'src', actions };
}

test('source updates read content staged earlier in the same run', async () => {
  const configDir = makeTempDir();
  writeFile(join(configDir, 'templates', 'index.ts.eta'), "import { Button } from './ui';\n");

  await runGenerator({
    generator: makeGenerator([
      addTemplates({ from: 'templates', to: '.' }),
      updateImports({ file: 'index.ts', from: './ui', members: ['Card'] }),
    ]),
    configDir,
    answers: {},
  });

  assert.equal(
    readFileSync(join(configDir, 'src', 'index.ts'), 'utf8'),
    "import { Button, Card } from './ui';\n",
  );
});

test('an unsupported source extension fails without modifying the file', async () => {
  const configDir = makeTempDir();
  writeFile(join(configDir, 'src', 'data.json'), '{"a":1}\n');

  await assert.rejects(
    runGenerator({
      generator: makeGenerator([updateImports({ file: 'data.json', from: './x', members: ['y'] })]),
      configDir,
      answers: {},
    }),
    /Unsupported source file extension "\.json"/,
  );

  assert.equal(readFileSync(join(configDir, 'src', 'data.json'), 'utf8'), '{"a":1}\n');
});

test('a source-update failure aborts the whole staged run', async () => {
  const configDir = makeTempDir();
  writeFile(join(configDir, 'templates', 'generated.ts.eta'), 'export const generated = true;\n');
  writeFile(join(configDir, 'src', 'broken.ts'), 'const = ;\n');

  await assert.rejects(
    runGenerator({
      generator: makeGenerator([
        addTemplates({ from: 'templates', to: '.' }),
        updateImports({ file: 'broken.ts', from: './x', members: ['y'] }),
      ]),
      configDir,
      answers: {},
    }),
    /Failed to parse .*broken\.ts/,
  );

  assert.equal(existsSync(join(configDir, 'src', 'generated.ts')), false);
});
