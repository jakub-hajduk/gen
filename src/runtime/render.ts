import {
  camelCase,
  capitalCase,
  constantCase,
  dotCase,
  kebabCase,
  noCase,
  pascalCase,
  pathCase,
  sentenceCase,
  snakeCase,
  trainCase,
} from 'change-case';
import { Eta } from 'eta';

export type StringFormatter = (value: string) => string;

export const formatters: Record<string, StringFormatter> = {
  camelCase,
  capitalCase,
  constantCase,
  dotCase,
  kebabCase,
  noCase,
  pascalCase,
  pathCase,
  sentenceCase,
  snakeCase,
  trainCase,
};

const eta = new Eta({ autoEscape: false, useWith: false });

export interface RenderContext {
  answers: Record<string, unknown>;
}

export function renderString(template: string, answers: Record<string, unknown>): string {
  return eta.renderString(template, { answers, format: formatters });
}

export function renderTemplateContent(template: string, answers: Record<string, unknown>): string {
  return renderString(template, answers);
}

const PLACEHOLDER_PATTERN = /\{([^{}]+)\}/g;

export function expandTemplateSegment(segment: string, answers: Record<string, unknown>): string {
  return segment.replace(PLACEHOLDER_PATTERN, (_match, token: string) => {
    const separator = token.indexOf(':');
    const formatterName = separator === -1 ? undefined : token.slice(0, separator);
    const key = separator === -1 ? token : token.slice(separator + 1);

    if (!Object.hasOwn(answers, key)) {
      throw new Error(`Unknown template placeholder "{${token}}": no input named "${key}".`);
    }

    const value = String(answers[key]);
    if (formatterName === undefined) return value;

    const formatter = formatters[formatterName];
    if (!formatter) {
      throw new Error(`Unknown formatter "${formatterName}" in template name "${segment}".`);
    }
    return formatter(value);
  });
}
