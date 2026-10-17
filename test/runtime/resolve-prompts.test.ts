import assert from 'node:assert/strict';
import { test } from 'node:test';

import { parsePromptValues } from '../../src/cli/parse-args';
import { resolvePrompts } from '../../src/runtime/resolve-prompts';
import { confirm, multiselect, number, select, text } from '../../src/prompts/index';
import { createFakeAdapter } from '../helpers/fake-adapter';

test('a supplied CLI value overrides and bypasses the interactive prompt', async () => {
  const adapter = createFakeAdapter({ interactive: true, text: 'ignored' });

  const answers = await resolvePrompts({
    prompts: { name: text({ message: 'Component name', default: 'Widget' }) },
    values: { name: 'Button' },
    adapter,
  });

  assert.equal(answers.name, 'Button');
  assert.equal(
    adapter.calls.some((call) => call.method === 'text'),
    false,
  );
});

test('an interactive prompt exposes its default for confirmation', async () => {
  const adapter = createFakeAdapter({ interactive: true });

  const answers = await resolvePrompts({
    prompts: { name: text({ message: 'Component name', default: 'Widget' }) },
    values: {},
    adapter,
  });

  assert.equal(answers.name, 'Widget');
  const call = adapter.calls.find((entry) => entry.method === 'text');
  assert.deepEqual(call?.options, {
    message: 'Component name',
    placeholder: undefined,
    default: 'Widget',
    validate: undefined,
  });
});

test('CLI values are validated with the prompt contract', async () => {
  await assert.rejects(
    resolvePrompts({
      prompts: {
        name: text({
          message: 'Component name',
          validate: (value) => value.length >= 3 || 'Name is too short',
        }),
      },
      values: { name: 'ab' },
      adapter: createFakeAdapter(),
    }),
    /Name is too short/,
  );
});

test('a missing non-interactive value names the required CLI flag', async () => {
  await assert.rejects(
    resolvePrompts({
      prompts: { name: text({ message: 'Component name' }) },
      values: {},
      adapter: createFakeAdapter({ interactive: false }),
    }),
    /Missing required value for "name"\. Provide it with --name\./,
  );
});

test('a missing non-interactive value falls back to its default', async () => {
  const answers = await resolvePrompts({
    prompts: { name: text({ message: 'Component name', default: 'Widget' }) },
    values: {},
    adapter: createFakeAdapter({ interactive: false }),
  });

  assert.equal(answers.name, 'Widget');
});

test('select defaults and options are validated from CLI input', async () => {
  const prompts = {
    framework: select({
      message: 'Framework',
      options: ['react', 'vue'],
      default: 'react',
    }),
  } as const;

  const values = parsePromptValues(['--framework', 'react'], prompts);
  const answers = await resolvePrompts({
    prompts,
    values,
    adapter: createFakeAdapter({ interactive: false }),
  });
  assert.equal(answers.framework, 'react');

  await assert.rejects(
    resolvePrompts({
      prompts,
      values: { framework: 'svelte' },
      adapter: createFakeAdapter({ interactive: false }),
    }),
    /Invalid value "svelte" for --framework/,
  );
});

test('numbers, confirms, and multiselects parse from CLI flags', async () => {
  const prompts = {
    count: number({ message: 'Count', min: 1 }),
    enabled: confirm({ message: 'Enabled' }),
    tags: multiselect({ message: 'Tags', options: ['a', 'b', 'c'] }),
  };

  const values = parsePromptValues(
    ['--count', '3', '--no-enabled', '--tags', 'a', '--tags', 'b'],
    prompts,
  );
  const answers = await resolvePrompts({
    prompts,
    values,
    adapter: createFakeAdapter({ interactive: false }),
  });

  assert.equal(answers.count, 3);
  assert.equal(answers.enabled, false);
  assert.deepEqual(answers.tags, ['a', 'b']);
});
