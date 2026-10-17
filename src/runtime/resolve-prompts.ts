import type { PromptAdapter } from '../cli/prompt-adapter';
import { flagNameFor } from '../cli/parse-args';
import type { AnyPrompt } from '../prompts/types';

function assertValid(definition: AnyPrompt, value: unknown, flag: string): void {
  const result = definition.validate?.(value as never);
  if (result === false) {
    throw new Error(`Invalid value for --${flag}.`);
  }
  if (typeof result === 'string') {
    throw new Error(result);
  }
}

function allowedValues(definition: AnyPrompt): string[] | undefined {
  if (definition.type === 'select' || definition.type === 'multiselect') {
    return definition.options.map((option) => option.value);
  }
  return undefined;
}

function parseConfirm(flag: string, values: Record<string, unknown>): boolean | undefined {
  if (values[`no-${flag}`] === true) return false;
  if (values[flag] === true) return true;
  if (values[flag] === false) return false;
  return undefined;
}

function parseCliValue(key: string, flag: string, definition: AnyPrompt, raw: unknown): unknown {
  if (definition.type === 'confirm') {
    return raw === true;
  }

  if (definition.type === 'multiselect') {
    const list = Array.isArray(raw)
      ? raw
      : String(raw)
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);
    const allowed = allowedValues(definition);
    if (allowed) {
      for (const item of list) {
        if (!allowed.includes(item)) {
          throw new Error(
            `Invalid value "${item}" for --${flag}. Allowed values: ${allowed.join(', ')}.`,
          );
        }
      }
    }
    if (definition.min !== undefined && list.length < definition.min) {
      throw new Error(`--${flag} requires at least ${definition.min} value(s).`);
    }
    if (definition.max !== undefined && list.length > definition.max) {
      throw new Error(`--${flag} accepts at most ${definition.max} value(s).`);
    }
    assertValid(definition, list, flag);
    return list;
  }

  if (definition.type === 'number') {
    const parsed = typeof raw === 'number' ? raw : Number(raw);
    if (Number.isNaN(parsed)) {
      throw new Error(`Invalid number for --${flag}.`);
    }
    if (definition.min !== undefined && parsed < definition.min) {
      throw new Error(`--${flag} must be at least ${definition.min}.`);
    }
    if (definition.max !== undefined && parsed > definition.max) {
      throw new Error(`--${flag} must be at most ${definition.max}.`);
    }
    assertValid(definition, parsed, flag);
    return parsed;
  }

  const value = String(raw);
  const allowed = allowedValues(definition);
  if (allowed && !allowed.includes(value)) {
    throw new Error(
      `Invalid value "${value}" for --${flag}. Allowed values: ${allowed.join(', ')}.`,
    );
  }
  if (definition.type === 'select' && value === '') {
    throw new Error(`Missing value for --${flag}.`);
  }
  assertValid(definition, value, flag);
  return value;
}

async function promptInteractively(
  key: string,
  definition: AnyPrompt,
  adapter: PromptAdapter,
): Promise<unknown> {
  switch (definition.type) {
    case 'text':
      return adapter.text({
        message: definition.message,
        placeholder: definition.placeholder,
        default: definition.default,
        validate: definition.validate,
      });
    case 'password':
      return adapter.password({ message: definition.message });
    case 'number':
      return adapter.number({
        message: definition.message,
        default: definition.default,
        min: definition.min,
        max: definition.max,
      });
    case 'confirm':
      return adapter.confirm({
        message: definition.message,
        default: definition.default,
      });
    case 'select':
      return adapter.select({
        message: definition.message,
        options: definition.options,
        default: definition.default,
      });
    case 'multiselect':
      return adapter.multiselect({
        message: definition.message,
        options: definition.options,
        default: definition.default,
        min: definition.min,
        max: definition.max,
      });
    default:
      throw new Error(`Unsupported prompt type for "${key}".`);
  }
}

export interface ResolvePromptsOptions {
  prompts?: Record<string, AnyPrompt>;
  values: Record<string, unknown>;
  adapter: PromptAdapter;
}

export async function resolvePrompts(
  options: ResolvePromptsOptions,
): Promise<Record<string, unknown>> {
  const definitions = options.prompts ?? {};
  const answers: Record<string, unknown> = {};

  for (const [key, definition] of Object.entries(definitions)) {
    const flag = flagNameFor(key);

    const cliValue = parseConfirm(flag, options.values);
    const hasCliValue =
      definition.type === 'confirm' ? cliValue !== undefined : options.values[flag] !== undefined;

    let value: unknown;

    if (hasCliValue) {
      const raw = definition.type === 'confirm' ? cliValue : options.values[flag];
      value = parseCliValue(key, flag, definition, raw);
    } else if (options.adapter.interactive) {
      value = await promptInteractively(key, definition, options.adapter);
      assertValid(definition, value, flag);
    } else if (definition.default !== undefined) {
      value = definition.default;
    } else {
      throw new Error(`Missing required value for "${key}". Provide it with --${flag}.`);
    }

    answers[key] = definition.format ? definition.format(value as never) : value;
  }

  return answers;
}
