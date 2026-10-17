export interface AddTemplatesAction {
  readonly type: 'add-templates';
  from: string;
  to: string;
}

export interface UpdateImportsAction {
  readonly type: 'update-imports';
  file: string;
  from: string;
  members: string[];
  typeOnly?: boolean;
}

export interface UpdateExportsAction {
  readonly type: 'update-exports';
  file: string;
  from: string;
  members: string[];
  typeOnly?: boolean;
}

/**
 * Extension point for consumer-defined action types. Augment this interface to
 * add a new action shape to the {@link Action} union:
 *
 * ```ts
 * declare module 'snipkit' {
 *   interface SnipkitActions {
 *     'acme/manifest': { readonly type: 'acme/manifest'; value: string };
 *   }
 * }
 * ```
 */
export interface SnipkitActions {}

export type BuiltinAction = AddTemplatesAction | UpdateImportsAction | UpdateExportsAction;

export type Action = BuiltinAction | SnipkitActions[keyof SnipkitActions];
