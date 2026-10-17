import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { commitRun } from '../../src/runtime/commit';
import { createRunContext } from '../../src/runtime/context';
import { createRunHooks } from '../../src/runtime/hooks';

function tempDir(): string {
  return mkdtempSync(join(tmpdir(), 'snipo-'));
}

test('commitRun writes staged files to disk', async () => {
  const dir = tempDir();
  const file = join(dir, 'generated.txt');
  const context = createRunContext({ configDir: dir, basePath: dir });
  context.files.write(file, 'hello');

  const hooks = createRunHooks();
  await commitRun(context, hooks);

  assert.equal(readFileSync(file, 'utf8'), 'hello');
});

test('a failing write lifecycle handler prevents a staged write', async () => {
  const dir = tempDir();
  const file = join(dir, 'generated.txt');
  const context = createRunContext({ configDir: dir, basePath: dir });
  context.files.write(file, 'hello');

  const hooks = createRunHooks();
  hooks.hook('write:before', () => {
    throw new Error('hook failed');
  });

  await assert.rejects(commitRun(context, hooks), /hook failed/);
  assert.equal(existsSync(file), false);
});

test('dry run reports staged paths without writing', async () => {
  const dir = tempDir();
  const file = join(dir, 'generated.txt');
  const context = createRunContext({
    configDir: dir,
    basePath: dir,
    dryRun: true,
  });
  context.files.write(file, 'hello');

  const paths = await commitRun(context, createRunHooks());

  assert.deepEqual(paths, [file]);
  assert.equal(existsSync(file), false);
});
