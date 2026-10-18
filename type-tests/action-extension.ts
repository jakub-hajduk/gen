import { join } from 'node:path';

import type { Action } from '../src/actions/types';
import { defineGenerator } from '../src/index';
import type { ActionHandlerRegistry } from '../src/runtime/actions';
import { stageFile } from '../src/runtime/stage';

declare module '../src/actions/types' {
  interface GenActions {
    'test/augmented': { readonly type: 'test/augmented'; value: string };
  }
}

export const augmentedAction: Action = { type: 'test/augmented', value: 'x' };

export const augmentedGenerator = defineGenerator({
  name: 'augmented',
  basePath: 'src',
  actions: [{ type: 'test/augmented', value: 'x' }],
});

export const handlers: Partial<ActionHandlerRegistry> = {
  'test/augmented': (action, context) => {
    stageFile(
      context,
      join(context.basePath, 'manifest.json'),
      JSON.stringify({ value: action.value }),
    );
  },
};
