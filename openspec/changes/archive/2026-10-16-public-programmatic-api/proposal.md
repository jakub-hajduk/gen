# Proposal

## Why

Snipkit is already structured as composable pieces (config loading, generator
discovery, prompt resolution, staged writes, rendering, hooks), but the published
package only exports the declarative DSL (`defineConfig`, `defineGenerator`, the
action constructors, and the prompt constructors). Everything needed to _run_ a
generator is unreachable from outside the package. A downstream tool therefore
cannot reuse Snipkit's engine; it can only shell out to the CLI.

The author wants to build other tools on top of Snipkit: a project-initialization
library that defines generators in code, and per-client branded CLIs that wrap
Snipkit with their own UI. Both need the engine as a public, typed programmatic
API — and the branded tools need to extend the engine with their own actions.

## What Changes

- Publish a programmatic API split by cost:
  - `snipkit` stays the zero-import declarative surface and additionally exports
    the shared **types** (`Action`, `PromptAdapter`, `RunContext`, `RunHooks`,
    `RunResult`, and the rest) so consumers get a single source of type truth.
  - New `snipkit/runtime` exposes the **functions**: `runGenerator`,
    `loadSnipkitConfig`, `discoverGenerators`, `resolveGenerator`,
    `resolvePrompts`, `createRunHooks`, `createActionHandlers`, the built-in
    action handlers, staging (`stageFile`/`stageSourceFile`), rendering
    (`renderTemplateContent`/`expandTemplateSegment`/`formatters`), path
    containment (`resolveWithinBase`), and the flag-parsing helpers.
  - `snipkit/cli` keeps `runCli` and the Clack adapter; Clack never enters the
    root or `snipkit/runtime`, so a non-interactive consumer does not pull it.
- Make custom action types possible through **module augmentation**:
  `interface SnipkitActions {}` plus `Action = Builtin | SnipkitActions[keyof
  SnipkitActions]`. A wrapper declares its action shape and the handler registry
  widens to match.
- Make the action-handler registry **overlay-based**: `runGenerator` (and the
  registry builder) accept `Partial<ActionHandlerRegistry>` and merge it over the
  built-in handlers, so a custom handler never displaces the built-ins.
- Allow running a generator **without a `snipkit.config.*` file**: `runGenerator`
  already takes `configDir` (base-path anchor) and `moduleDir` (template anchor)
  explicitly, and the public API documents this code-defined usage.
- **BREAKING** (internal only, not yet public): the `Action` type becomes open
  and the handler registry becomes partial. These are type-level changes inside
  Snipkit; no previously published export changes shape.

## Capabilities

### New Capabilities

- `programmatic-api`: the published entry points and the functions/types that let
  another library load, resolve, and run Snipkit generators programmatically,
  including the dependency-free root type surface and the Clack-free runtime
  entry.
- `action-extension`: extensibility of the generator action set — module
  augmentation to add action types, and an overlay handler registry that
  preserves built-in actions while adding custom ones.

### Modified Capabilities

<!-- None: existing capabilities (generator-cli, template-generation,
     module-source-updates) describe CLI behavior and the built-in actions; this
     change exposes that behavior without altering it. -->

## Impact

- **Public package surface**: new `snipkit/runtime` export and a new specifier for
  the AST editors; root `index.ts` gains type re-exports. `package.json`
  `exports` map and `tsdown.config.ts` entry list grow.
- **Code**: `src/index.ts`, new `src/runtime.ts` (or equivalent), and `src/actions/types.ts`
  (open `Action` union); `src/runtime/actions.ts` and `src/runtime/run-generator.ts`
  (overlay handlers and partial registry typing). No behavioral change to the CLI.
- **Dependencies**: `snipkit/runtime` pulls `eta`, `change-case`, `writepool`,
  `hookable`, `c12`, `jiti`, `tinyglobby`, and `typescript`; `snipkit` (root)
  remains import-free. Type leaks (`RunContext.files: Writepool`, `RunHookable`)
  are addressed in design.
- **Consumers**: enables the project-initializer library and branded wrapper CLIs;
  `snipkit/runtime` and the augmented `Action` become a versioned public contract.
- **Docs/tests**: README programmatic-usage section, a type-test proving the
  augmentation reaches `Action` through the runtime entry, and runtime tests for
  overlay handlers and code-defined runs.
