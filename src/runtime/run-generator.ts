import { resolve } from 'node:path';
import type { Generator } from '../config/define-generator';
import { runActions, type ActionHandlerRegistry } from './actions';
import { commitRun } from './commit';
import { createRunContext, type RunContext } from './context';
import { createActionHandlers } from './handlers';
import { createRunHooks, type RunHookable } from './hooks';

export interface ResolveBasePathOptions {
  generator: Generator;
  configDir: string;
}

export function resolveBasePath(options: ResolveBasePathOptions): string {
  const { basePath } = options.generator;
  if (typeof basePath !== 'string' || basePath.trim() === '') {
    throw new Error(`Generator "${options.generator.name}" requires a non-empty basePath.`);
  }
  return resolve(options.configDir, basePath);
}

export interface RunGeneratorOptions {
  generator: Generator;
  configDir: string;
  moduleDir?: string;
  answers?: Record<string, unknown>;
  dryRun?: boolean;
  force?: boolean;
  hooks?: RunHookable;
  handlers?: Partial<ActionHandlerRegistry>;
}

export interface RunResult {
  basePath: string;
  context: RunContext;
  files: string[];
  written: boolean;
}

export async function runGenerator(options: RunGeneratorOptions): Promise<RunResult> {
  const hooks = options.hooks ?? createRunHooks();
  const basePath = resolveBasePath({
    generator: options.generator,
    configDir: options.configDir,
  });

  const context = createRunContext({
    configDir: options.configDir,
    moduleDir: options.moduleDir,
    basePath,
    answers: options.answers,
    dryRun: options.dryRun,
    force: options.force,
  });

  const handlers = { ...createActionHandlers(), ...options.handlers };

  await runActions(options.generator.actions, context, hooks, handlers);

  const files = await commitRun(context, hooks);

  return { basePath, context, files, written: !context.dryRun };
}
