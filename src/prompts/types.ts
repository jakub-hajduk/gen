export type PromptType = 'text' | 'password' | 'number' | 'confirm' | 'select' | 'multiselect';

export interface PromptChoice {
  value: string;
  label?: string;
  hint?: string;
}

export interface PromptBase<T> {
  message: string;
  description?: string;
  alias?: string;
  default?: T;
  validate?: (value: T) => boolean | string;
  format?: (value: T) => unknown;
}

export interface TextPromptDefinition extends PromptBase<string> {
  readonly type: 'text';
  placeholder?: string;
}

export interface PasswordPromptDefinition extends PromptBase<string> {
  readonly type: 'password';
}

export interface NumberPromptDefinition extends PromptBase<number> {
  readonly type: 'number';
  min?: number;
  max?: number;
}

export interface ConfirmPromptDefinition extends PromptBase<boolean> {
  readonly type: 'confirm';
}

export interface SelectPromptDefinition extends PromptBase<string> {
  readonly type: 'select';
  options: PromptChoice[];
}

export interface MultiselectPromptDefinition extends PromptBase<string[]> {
  readonly type: 'multiselect';
  options: PromptChoice[];
  min?: number;
  max?: number;
}

export type BuiltinPrompt =
  | TextPromptDefinition
  | PasswordPromptDefinition
  | NumberPromptDefinition
  | ConfirmPromptDefinition
  | SelectPromptDefinition
  | MultiselectPromptDefinition;

export type AnyPrompt = BuiltinPrompt;

export type PromptValue<P> = P extends { type: 'multiselect' }
  ? string[]
  : P extends { type: 'number' }
    ? number
    : P extends { type: 'confirm' }
      ? boolean
      : string;

export type PromptAnswers<TPrompts extends Record<string, AnyPrompt>> = {
  [K in keyof TPrompts]: PromptValue<TPrompts[K]>;
};

export type BuiltinPromptOptions =
  | Omit<TextPromptDefinition, 'type'>
  | Omit<PasswordPromptDefinition, 'type'>
  | Omit<NumberPromptDefinition, 'type'>
  | Omit<ConfirmPromptDefinition, 'type'>
  | Omit<SelectPromptDefinition, 'type'>
  | Omit<MultiselectPromptDefinition, 'type'>;
