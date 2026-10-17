import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  expandTemplateSegment,
  renderString,
  renderTemplateContent,
} from '../../src/runtime/render';

test('renders an input value under it.answers', () => {
  const output = renderString('Hello <%= it.answers.name %>', {
    name: 'world',
  });
  assert.equal(output, 'Hello world');
});

test('renders a change-case formatter under it.format', () => {
  const output = renderString('<%= it.format.pascalCase(it.answers.name) %>', {
    name: 'user profile',
  });
  assert.equal(output, 'UserProfile');
});

test('renders configuration strings with standard Eta delimiters', () => {
  const output = renderTemplateContent('src/<%= it.answers.kind %>', {
    kind: 'components',
  });
  assert.equal(output, 'src/components');
});

test('expands a formatted filesystem placeholder', () => {
  const output = expandTemplateSegment('{pascalCase:name}.tsx', {
    name: 'user profile',
  });
  assert.equal(output, 'UserProfile.tsx');
});

test('rejects an unknown filesystem formatter', () => {
  assert.throws(
    () => expandTemplateSegment('{loudCase:name}.ts', { name: 'thing' }),
    /Unknown formatter "loudCase"/,
  );
});

test('rejects a missing filesystem placeholder value', () => {
  assert.throws(() => expandTemplateSegment('{missing}.ts', {}), /Unknown template placeholder/);
});
