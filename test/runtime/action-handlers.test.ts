import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

import { addTemplates } from '../../src/actions/index';
import type { Generator } from '../../src/config/define-generator';
import type { ActionHandlerRegistry } from '../../src/runtime/actions';
import { createActionHandlers } from '../../src/runtime/handlers';
import { runGenerator } from '../../src/runtime/run-generator';
import { stageFile } from '../../src/runtime/stage';
import { makeTempDir, writeFile } from '../helpers/fixtures';

declare module '../../src/actions/types' {
  interface SnipkitActions {
    'test/manifest': { readonly type: 'test/manifest'; value: string };
  }
}

function customHandlers(): Partial<ActionHandlerRegistry> {
  return {
    'test/manifest': (action, context) => {
      stageFile(
        context,
        join(context.basePath, 'manifest.json'),
        JSON.stringify({ value: action.value }),
      );
    },
  };
}

function makeGenerator(actions: Generator['actions']): Generator {
  return { name: 'component', basePath: 'src', actions };
}

test('a custom handler runs alongside a built-in action in one commit', async () => {
  const configDir = makeTempDir();
  writeFile(join(configDir, 'templates', 'generated.ts.eta'), 'export const generated = true;\n');

  await runGenerator({
    generator: makeGenerator([
      addTemplates({ from: 'templates', to: '.' }),
      { type: 'test/manifest', value: 'acme' },
    ]),
    configDir,
    answers: {},
    handlers: { ...createActionHandlers(), ...customHandlers() },
  });

  assert.equal(
    readFileSync(join(configDir, 'src', 'generated.ts'), 'utf8'),
    'export const generated = true;\n',
  );
  assert.equal(
    readFileSync(join(configDir, 'src', 'manifest.json'), 'utf8'),
    JSON.stringify({ value: 'acme' }),
  );
});

test('an action with no registered handler aborts before writing', async () => {
  const configDir = makeTempDir();
  writeFile(join(configDir, 'templates', 'generated.ts.eta'), 'export const generated = true;\n');

  await assert.rejects(
    runGenerator({
      generator: makeGenerator([
        addTemplates({ from: 'templates', to: '.' }),
        { type: 'test/manifest', value: 'acme' },
      ]),
      configDir,
      answers: {},
    }),
    /Unsupported action type "test\/manifest"/,
  );

  assert.equal(existsSync(join(configDir, 'src', 'generated.ts')), false);
});
