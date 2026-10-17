# Tasks

## 1. Action extensibility and handler overlay

- [x] 1.1 Add `interface SnipkitActions {}` and widen the `Action` union in `src/actions/types.ts` (`Builtin | SnipkitActions[keyof SnipkitActions]`); add a type-test proving an augmented action type is accepted by `defineGenerator` and run `pnpm typecheck`.
- [x] 1.2 Type `createActionHandlers` as returning `Partial<ActionHandlerRegistry>` and export it from the runtime entry module; verify `pnpm typecheck`.
- [x] 1.3 Change `RunGeneratorOptions.handlers` to `Partial<ActionHandlerRegistry>` and compose `{ ...createActionHandlers(), ...options.handlers }` in `runGenerator`; verify existing `test/runtime/*` pass with `pnpm test`.
- [x] 1.4 Add a runtime test where a custom handler runs alongside a built-in action and stages into the shared commit, and where an action with no handler aborts before any file is written; verify with `pnpm test`.
- [x] 1.5 Document the augmentation recipe (namespaced action key, registering the handler) in the README; verify the snippet compiles by mirroring it in the type-test file.

## 2. Public entry-point surface

- [x] 2.1 Create `src/runtime.ts` re-exporting the Clack-free functions (`runGenerator`, `resolveBasePath`, `createRunContext`, `commitRun`, `loadSnipkitConfig`, `discoverGenerators`, `resolveGenerator`, `resolvePrompts`, `createRunHooks`, `createActionHandlers`, the `apply*` handlers, `stageFile`/`stageSourceFile`, `renderString`/`renderTemplateContent`/`expandTemplateSegment`/`formatters`, `resolveWithinBase`, and the flag-parsing helpers), with the AST editors aliased as `editImports`/`editExports`; verify `pnpm typecheck` and that nothing in the module imports `src/cli/clack-adapter.ts`.
- [x] 2.2 Re-export the public types from `src/index.ts` (`Action`, `SnipkitActions`, `PromptAdapter`, `PromptCancelledError`, `RunContext`, `RunHooks`, `RunHookable`, `RunResult`, `RunGeneratorOptions`, `DiscoveredGenerator`, `LoadedConfig`, `Writepool`, `Hookable`, `ImportUpdate`, `ExportUpdate`); verify `pnpm typecheck`.
- [x] 2.3 Add the `snipkit/runtime` subpath to the `package.json` `exports` map and `src/runtime.ts` to the `tsdown.config.ts` entries; verify `pnpm build` emits `dist/runtime.mjs` and `dist/runtime.d.mts`.
- [x] 2.4 Add a test asserting `dist/index.mjs` contains no import statements and `dist/runtime.mjs` does not import `@clack/prompts`; verify with `pnpm build && pnpm test`.
- [x] 2.5 Add a README programmatic-usage section (load config, resolve by name, resolve prompts with an adapter, run a generator); verify every identifier it names is exported by the built root or `snipkit/runtime` entries.

## 3. End-to-end programmatic verification

- [x] 3.1 Integration test: run a code-defined generator with no `snipkit.config.*` by passing `configDir`, `moduleDir`, and `answers` to `runGenerator`; assert the output files, and that a dry run returns the staged list without writing.
- [x] 3.2 Integration test: load config → resolve a generator by name → run it through the public exports; assert an unknown name fails with an error listing the available generator names.
- [x] 3.3 Integration test: resolve prompts through a non-interactive adapter; assert a supplied value bypasses the adapter and a missing required value fails with an error naming the value.
- [x] 3.4 Run `pnpm check` (lint, format check, typecheck) and `pnpm test`; verify all pass.

## Workflow follow-up

- Archive the change once the project's review requirements are satisfied.
