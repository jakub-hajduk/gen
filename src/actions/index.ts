import type { AddTemplatesAction, UpdateExportsAction, UpdateImportsAction } from './types';

export type {
  Action,
  AddTemplatesAction,
  BuiltinAction,
  SnipoActions,
  UpdateExportsAction,
  UpdateImportsAction,
} from './types';

export type AddTemplatesOptions = Omit<AddTemplatesAction, 'type'>;
export type UpdateImportsOptions = Omit<UpdateImportsAction, 'type'>;
export type UpdateExportsOptions = Omit<UpdateExportsAction, 'type'>;

export function addTemplates(options: AddTemplatesOptions): AddTemplatesAction {
  return { type: 'add-templates', ...options };
}

export function updateImports(options: UpdateImportsOptions): UpdateImportsAction {
  return { type: 'update-imports', ...options };
}

export function updateExports(options: UpdateExportsOptions): UpdateExportsAction {
  return { type: 'update-exports', ...options };
}
