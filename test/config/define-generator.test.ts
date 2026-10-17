import assert from 'node:assert/strict';
import { test } from 'node:test';

import { defineGenerator, isGenerator } from '../../src/config/define-generator';

test('defineGenerator brands a generator that isGenerator recognizes', () => {
  const generator = defineGenerator({ name: 'component', basePath: 'src', actions: [] });

  assert.equal(isGenerator(generator), true);
});

test('isGenerator rejects values without the brand', () => {
  assert.equal(isGenerator({ name: 'component', basePath: 'src', actions: [] }), false);
  assert.equal(isGenerator(undefined), false);
  assert.equal(isGenerator(null), false);
  assert.equal(isGenerator([]), false);
  assert.equal(isGenerator('component'), false);
});
