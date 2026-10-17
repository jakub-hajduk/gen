import type { PromptChoice } from '../prompts/types';

export interface GeneratorChoice {
  name: string;
  description?: string;
}

export interface TextInteractionOptions {
  message: string;
  placeholder?: string;
  default?: string;
  validate?: (value: string) => boolean | string;
}

export interface PasswordInteractionOptions {
  message: string;
}

export interface NumberInteractionOptions {
  message: string;
  default?: number;
  min?: number;
  max?: number;
}

export interface ConfirmInteractionOptions {
  message: string;
  default?: boolean;
}

export interface SelectInteractionOptions {
  message: string;
  options: PromptChoice[];
  default?: string;
}

export interface MultiselectInteractionOptions {
  message: string;
  options: PromptChoice[];
  default?: string[];
  min?: number;
  max?: number;
}

export interface PromptAdapter {
  readonly interactive: boolean;
  selectGenerator(choices: GeneratorChoice[]): Promise<string>;
  text(options: TextInteractionOptions): Promise<string>;
  password(options: PasswordInteractionOptions): Promise<string>;
  number(options: NumberInteractionOptions): Promise<number>;
  confirm(options: ConfirmInteractionOptions): Promise<boolean>;
  select(options: SelectInteractionOptions): Promise<string>;
  multiselect(options: MultiselectInteractionOptions): Promise<string[]>;
}

export class PromptCancelledError extends Error {
  constructor() {
    super('The prompt was cancelled.');
    this.name = 'PromptCancelledError';
  }
}
