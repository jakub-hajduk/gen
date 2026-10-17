import assert from 'node:assert/strict';
import { test } from 'node:test';

import { text } from '../../src/index';
import { resolvePrompts } from '../../src/runtime';
import { createFakeAdapter } from '../helpers/fake-adapter';

test('a supplied value bypasses the non-interactive adapter', async () => {
  const adapter = createFakeAdapter();

  const answers = await resolvePrompts({
    prompts: { name: text({ message: 'Component name' }) },
    values: { name: 'Button' },
    adapter,
  });

  assert.equal(answers.name, 'Button');
  assert.equal(
    adapter.calls.some((call) => call.method === 'text'),
    false,
  );
});

test('a missing required value fails and names the value', async () => {
  await assert.rejects(
    resolvePrompts({
      prompts: { name: text({ message: 'Component name' }) },
      values: {},
      adapter: createFakeAdapter(),
    }),
    /Missing required value for "name"\. Provide it with --name\./,
  );
});
