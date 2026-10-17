import type { Action } from '../actions/types';
import type { AnyPrompt } from '../prompts/types';

export const GENERATOR_BRAND = Symbol.for('snipkit.generator');

export interface Generator<TPrompts extends Record<string, AnyPrompt> = Record<string, AnyPrompt>> {
  name: string;
  description?: string;
  basePath: string;
  prompts?: TPrompts;
  actions: Action[];
}

export function defineGenerator<TPrompts extends Record<string, AnyPrompt>>(
  generator: Generator<TPrompts>,
): Generator<TPrompts> {
  Object.defineProperty(generator, GENERATOR_BRAND, { value: true });
  return generator;
}

export function isGenerator(value: unknown): value is Generator {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as Record<PropertyKey, unknown>)[GENERATOR_BRAND] === true
  );
}
