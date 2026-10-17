import type { Action } from '../actions/types';
import type { RunContext } from './context';
import type { RunHookable } from './hooks';

export type ActionHandlerFor<TType extends Action['type']> = (
  action: Extract<Action, { type: TType }>,
  context: RunContext,
) => void | Promise<void>;

export type ActionHandlerRegistry = {
  [TType in Action['type']]: ActionHandlerFor<TType>;
};

export async function runActions(
  actions: Action[],
  context: RunContext,
  hooks: RunHookable,
  handlers: Partial<ActionHandlerRegistry>,
): Promise<void> {
  for (let index = 0; index < actions.length; index++) {
    const action = actions[index];

    await hooks.callHook('action:before', { action, index, context });

    const handler = handlers[action.type] as
      | ((action: Action, context: RunContext) => void | Promise<void>)
      | undefined;
    if (!handler) {
      throw new Error(`Unsupported action type "${action.type}".`);
    }

    await handler(action, context);

    await hooks.callHook('action:after', { action, index, context });
  }
}
