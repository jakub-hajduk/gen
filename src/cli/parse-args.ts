import { parseArgs, type ParseArgsOptionsConfig } from 'node:util';
import { kebabCase } from 'change-case';
import type { AnyPrompt } from '../prompts/types';

export const RESERVED_FLAGS = ['dry-run', 'force', 'help', 'version'] as const;
const RESERVED_SHORTS = ['h', 'v'] as const;

export interface GlobalFlags {
  dryRun: boolean;
  force: boolean;
  help: boolean;
  version: boolean;
}

const GLOBAL_SPEC: ParseArgsOptionsConfig = {
  'dry-run': { type: 'boolean' },
  force: { type: 'boolean' },
  help: { type: 'boolean', short: 'h' },
  version: { type: 'boolean', short: 'v' },
};

export interface GlobalParseResult {
  global: GlobalFlags;
  generatorName?: string;
}

export function parseGlobalFlags(argv: string[]): GlobalParseResult {
  const parsed = parseArgs({
    args: argv,
    options: GLOBAL_SPEC,
    allowPositionals: true,
    strict: false,
  });

  const first = argv[0];
  return {
    global: {
      dryRun: parsed.values['dry-run'] === true,
      force: parsed.values.force === true,
      help: parsed.values.help === true,
      version: parsed.values.version === true,
    },
    generatorName: first !== undefined && !first.startsWith('-') ? first : undefined,
  };
}

export function flagNameFor(key: string): string {
  return kebabCase(key);
}

export function argumentSpecFor(prompts: Record<string, AnyPrompt>): ParseArgsOptionsConfig {
  const spec: ParseArgsOptionsConfig = { ...GLOBAL_SPEC };

  for (const [key, definition] of Object.entries(prompts)) {
    const flag = flagNameFor(key);
    if ((RESERVED_FLAGS as readonly string[]).includes(flag)) {
      throw new Error(`Prompt "${key}" uses a reserved flag name "--${flag}".`);
    }

    const short = definition.alias;
    if (short !== undefined && (RESERVED_SHORTS as readonly string[]).includes(short)) {
      throw new Error(`Prompt "${key}" uses a reserved alias "-${short}".`);
    }

    if (definition.type === 'multiselect') {
      spec[flag] = { type: 'string', multiple: true, ...(short ? { short } : {}) };
    } else if (definition.type === 'confirm') {
      spec[flag] = { type: 'boolean', ...(short ? { short } : {}) };
      spec[`no-${flag}`] = { type: 'boolean' };
    } else {
      spec[flag] = { type: 'string', ...(short ? { short } : {}) };
    }
  }

  return spec;
}

export function parsePromptValues(
  argv: string[],
  prompts: Record<string, AnyPrompt>,
): Record<string, unknown> {
  const parsed = parseArgs({
    args: argv,
    options: argumentSpecFor(prompts),
    allowPositionals: true,
    strict: false,
  });
  return parsed.values;
}
