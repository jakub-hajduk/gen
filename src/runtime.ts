export { runGenerator, resolveBasePath } from './runtime/run-generator';
export type {
  ResolveBasePathOptions,
  RunGeneratorOptions,
  RunResult,
} from './runtime/run-generator';

export { createRunContext } from './runtime/context';
export type { CreateRunContextOptions, RunContext } from './runtime/context';

export { commitRun } from './runtime/commit';

export { findNearestConfig, findProjectBoundary, loadSnipkitConfig } from './config/load-config';
export type { LoadedConfig } from './config/load-config';

export { discoverGenerators, resolveGeneratorModules } from './config/discover-generators';
export type { DiscoveredGenerator, DiscoverGeneratorsOptions } from './config/discover-generators';

export { resolveGenerator } from './runtime/resolve-generator';
export type { ResolveGeneratorOptions } from './runtime/resolve-generator';

export { resolvePrompts } from './runtime/resolve-prompts';
export type { ResolvePromptsOptions } from './runtime/resolve-prompts';

export { createRunHooks } from './runtime/hooks';
export type { RunHooks, RunHookable } from './runtime/hooks';

export { createActionHandlers } from './runtime/handlers';
export { applyAddTemplates } from './runtime/handlers/add-templates';
export { applyUpdateImports } from './runtime/handlers/update-imports';
export { applyUpdateExports } from './runtime/handlers/update-exports';
export type { ActionHandlerFor, ActionHandlerRegistry } from './runtime/actions';

export { stageFile, stageSourceFile } from './runtime/stage';

export {
  expandTemplateSegment,
  formatters,
  renderString,
  renderTemplateContent,
} from './runtime/render';
export type { RenderContext, StringFormatter } from './runtime/render';

export { resolveWithinBase } from './runtime/paths';

export {
  argumentSpecFor,
  flagNameFor,
  parseGlobalFlags,
  parsePromptValues,
  RESERVED_FLAGS,
} from './cli/parse-args';
export type { GlobalFlags, GlobalParseResult } from './cli/parse-args';

export type { GeneratorChoice, PromptAdapter } from './cli/prompt-adapter';

export {
  SUPPORTED_SOURCE_EXTENSIONS,
  updateImports as editImports,
  updateExports as editExports,
} from './runtime/source-update';
export type { ExportUpdate, ImportUpdate } from './runtime/source-update';
