import type {
  ConfirmPromptDefinition,
  MultiselectPromptDefinition,
  NumberPromptDefinition,
  PasswordPromptDefinition,
  PromptChoice,
  SelectPromptDefinition,
  TextPromptDefinition,
} from './types';

export type {
  AnyPrompt,
  BuiltinPrompt,
  PromptAnswers,
  PromptChoice,
  PromptValue,
  PromptType,
} from './types';

type TextOptions = Omit<TextPromptDefinition, 'type'>;
type PasswordOptions = Omit<PasswordPromptDefinition, 'type'>;
type NumberOptions = Omit<NumberPromptDefinition, 'type'>;
type ConfirmOptions = Omit<ConfirmPromptDefinition, 'type'>;
type SelectOptions = Omit<SelectPromptDefinition, 'type' | 'options'> & {
  options: Array<string | PromptChoice>;
};
type MultiselectOptions = Omit<MultiselectPromptDefinition, 'type' | 'options'> & {
  options: Array<string | PromptChoice>;
};

function normalizeChoice(choice: string | PromptChoice): PromptChoice {
  return typeof choice === 'string' ? { value: choice } : choice;
}

export function text(options: TextOptions): TextPromptDefinition {
  return { type: 'text', ...options };
}

export function password(options: PasswordOptions): PasswordPromptDefinition {
  return { type: 'password', ...options };
}

export function number(options: NumberOptions): NumberPromptDefinition {
  return { type: 'number', ...options };
}

export function confirm(options: ConfirmOptions): ConfirmPromptDefinition {
  return { type: 'confirm', ...options };
}

export function select(options: SelectOptions): SelectPromptDefinition {
  return { type: 'select', ...options, options: options.options.map(normalizeChoice) };
}

export function multiselect(options: MultiselectOptions): MultiselectPromptDefinition {
  return {
    type: 'multiselect',
    ...options,
    options: options.options.map(normalizeChoice),
  };
}
