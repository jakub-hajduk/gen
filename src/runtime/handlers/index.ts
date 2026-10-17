import type { ActionHandlerRegistry } from '../actions';
import { applyAddTemplates } from './add-templates';
import { applyUpdateExports } from './update-exports';
import { applyUpdateImports } from './update-imports';

export function createActionHandlers(): Partial<ActionHandlerRegistry> {
  return {
    'add-templates': applyAddTemplates,
    'update-imports': applyUpdateImports,
    'update-exports': applyUpdateExports,
  };
}
