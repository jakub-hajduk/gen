import {
  confirm as clackConfirm,
  isCancel,
  multiselect as clackMultiselect,
  password as clackPassword,
  select as clackSelect,
  text as clackText,
} from '@clack/prompts';
import type { PromptChoice } from '../prompts/types';
import {
  PromptCancelledError,
  type ConfirmInteractionOptions,
  type GeneratorChoice,
  type MultiselectInteractionOptions,
  type NumberInteractionOptions,
  type PasswordInteractionOptions,
  type PromptAdapter,
  type SelectInteractionOptions,
  type TextInteractionOptions,
} from './prompt-adapter';

function ensure<T>(value: unknown): T {
  if (isCancel(value)) throw new PromptCancelledError();
  return value as T;
}

function toValidate(
  validate?: (value: string) => boolean | string,
): ((value: string | undefined) => string | undefined) | undefined {
  if (!validate) return undefined;
  return (value) => {
    if (value === undefined) return undefined;
    const result = validate(value);
    if (result === true) return undefined;
    if (result === false) return 'Invalid value';
    return result;
  };
}

function mapOptions(choices: PromptChoice[]) {
  return choices.map((choice) => ({
    value: choice.value,
    label: choice.label ?? choice.value,
    hint: choice.hint,
  }));
}

export function createClackAdapter(interactive?: boolean): PromptAdapter {
  const isInteractive = interactive ?? Boolean(process.stdin.isTTY && process.stdout.isTTY);

  return {
    interactive: isInteractive,

    async selectGenerator(choices: GeneratorChoice[]): Promise<string> {
      const value = await clackSelect<string>({
        message: 'Select a generator',
        options: choices.map((choice) => ({
          value: choice.name,
          label: choice.name,
          hint: choice.description,
        })),
      });
      return ensure<string>(value);
    },

    async text(options: TextInteractionOptions): Promise<string> {
      const value = await clackText({
        message: options.message,
        placeholder: options.placeholder,
        initialValue: options.default,
        validate: toValidate(options.validate),
      });
      return ensure<string>(value);
    },

    async password(options: PasswordInteractionOptions): Promise<string> {
      const value = await clackPassword({ message: options.message });
      return ensure<string>(value);
    },

    async number(options: NumberInteractionOptions): Promise<number> {
      const value = await clackText({
        message: options.message,
        initialValue: options.default === undefined ? undefined : String(options.default),
        validate: (input) => {
          const raw = input ?? '';
          if (raw.trim() === '' || Number.isNaN(Number(raw))) {
            return 'Enter a number';
          }
          const parsed = Number(raw);
          if (options.min !== undefined && parsed < options.min) {
            return `Must be at least ${options.min}`;
          }
          if (options.max !== undefined && parsed > options.max) {
            return `Must be at most ${options.max}`;
          }
          return undefined;
        },
      });
      return Number(ensure<string>(value));
    },

    async confirm(options: ConfirmInteractionOptions): Promise<boolean> {
      const value = await clackConfirm({
        message: options.message,
        initialValue: options.default,
      });
      return ensure<boolean>(value);
    },

    async select(options: SelectInteractionOptions): Promise<string> {
      const value = await clackSelect<string>({
        message: options.message,
        options: mapOptions(options.options),
        initialValue: options.default,
      });
      return ensure<string>(value);
    },

    async multiselect(options: MultiselectInteractionOptions): Promise<string[]> {
      const value = await clackMultiselect<string>({
        message: options.message,
        options: mapOptions(options.options),
        initialValues: options.default,
        required: (options.min ?? 0) > 0,
      });
      return ensure<string[]>(value);
    },
  };
}
