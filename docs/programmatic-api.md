# Programmatic API

The `snipo` CLI is a thin shell over a library. The same functions that drive
the binary run from any Node program, so a project-initialization tool or a
branded wrapper can load a configuration, pick a generator, collect answers, and
write files without spawning a subprocess.

The package splits that surface by cost. Each entry point pulls in only what it
needs.

| Specifier       | What it gives you                                                | What it loads                 |
| --------------- | ---------------------------------------------------------------- | ----------------------------- |
| `snipo`         | The declaration helpers and every public type                    | No runtime engines            |
| `snipo/runtime` | The functions that load, resolve, prompt, run, render, and stage | No interactive-prompt library |
| `snipo/cli`     | The `snipo` binary                                               | `@clack/prompts`              |

`snipo/cli` is the executable entry. It exports nothing, so import it only to
run the CLI.

A project that only declares generators imports `snipo` and stops there. The
root re-exports the prompt and action constructors plus the shared types, and it
imports no configuration loader, template engine, or source editor. The runtime
entry carries those engines and never imports the Clack adapter.

## Types at the root

`snipo` is the single source of truth for types. Import them from the root
rather than from `snipo/runtime`, so a declaration-only file never reaches the
engine.

- **Declaration**: `Generator`, `SnipoConfig`.
- **Actions**: `Action`, `BuiltinAction`, `SnipoActions`, `AddTemplatesAction`,
  `UpdateImportsAction`, `UpdateExportsAction`, and their option types.
- **Handlers**: `ActionHandlerFor`, `ActionHandlerRegistry`.
- **Prompts**: `AnyPrompt`, `BuiltinPrompt`, `PromptAnswers`, `PromptChoice`,
  `PromptType`, `PromptValue`, `PromptAdapter`, `GeneratorChoice`,
  `PromptCancelledError`.
- **Running**: `RunContext`, `CreateRunContextOptions`, `RunGeneratorOptions`,
  `RunResult`, `ResolveBasePathOptions`, `RunHooks`, `RunHookable`,
  `LoadedConfig`, `DiscoveredGenerator`, `DiscoverGeneratorsOptions`,
  `ImportUpdate`, `ExportUpdate`.
- **Re-exported from dependencies**: `Writepool` and `Hookable`, so you can
  annotate a run context or a hook registry without importing those packages
  yourself.

`SnipoActions` is the augmentation target for custom actions. It is empty by
default and declared in `src/actions/types.ts`.

## Running a generator from code

`runGenerator` takes a generator, the directory that anchors `basePath`
(`configDir`), the directory that anchors template `from` paths (`moduleDir`), and
the answers to use. It runs the actions, commits the staged writes, and returns
the written file list.

```ts
import { addTemplates, defineGenerator } from 'snipo';
import { runGenerator } from 'snipo/runtime';

const generator = defineGenerator({
  name: 'component',
  basePath: 'src',
  actions: [addTemplates({ from: 'templates/component', to: '.' })],
});

const result = await runGenerator({
  generator,
  configDir: process.cwd(),
  moduleDir: process.cwd(),
  answers: { name: 'Button' },
});

result.files; // absolute paths that were written
result.written; // false when dryRun was set
```

No `snipo.config.*` file is required. When `configDir` and `moduleDir` point at
the same directory, the generator behaves as if it lived next to the
configuration. Pass `dryRun: true` to stage everything and return the planned
paths without touching disk. Pass `force: true` to overwrite existing files.

## Driving the discovery pipeline

When a tool needs to read a project's configuration instead of receiving the
generator directly, the runtime exposes each phase as its own function.

```ts
import type { PromptAdapter } from 'snipo';
import { loadSnipoConfig, resolveGenerator, resolvePrompts, runGenerator } from 'snipo/runtime';

const adapter: PromptAdapter = createMyAdapter();
const loaded = await loadSnipoConfig(process.cwd());

const resolved = await resolveGenerator({
  generators: loaded.generators,
  name: 'component',
  prompts: adapter,
});

const answers = await resolvePrompts({
  prompts: resolved.generator.prompts,
  values: { name: 'Button' },
  adapter,
});

await runGenerator({
  generator: resolved.generator,
  configDir: loaded.configDir,
  moduleDir: resolved.moduleDir,
  answers,
});
```

- `loadSnipoConfig(cwd)` finds the nearest `snipo.config.*`, loads it, and
  discovers its generator modules. It returns the raw `config`, the resolved
  `generators`, and the `configPath`, `configDir`, and `boundary` it used. A
  missing configuration names the starting directory and the boundary; a
  malformed one names the path.
- `resolveGenerator({ generators, name, prompts })` returns the matched generator
  together with the directory of the module that defined it. An unknown name
  fails with the list of available names; an empty generator set fails on its
  own; with no name and a non-interactive adapter it fails and lists the names.
- `resolvePrompts({ prompts, values, adapter })` returns the answers map. It
  applies each prompt's validation, prefers a supplied value over the adapter,
  falls back to a `default`, and otherwise fails naming the missing value.

The lower-level pieces are exported too: `findNearestConfig`,
`findProjectBoundary`, `discoverGenerators`, and `resolveGeneratorModules` cover
discovery; `resolveBasePath`, `createRunContext`, and `commitRun` cover the run
lifecycle when you assemble it by hand.

## Writing a prompt adapter

Anything that resolves prompt answers goes through a `PromptAdapter`. The
interactive CLI uses the Clack adapter; a non-interactive tool supplies its own.

```ts
import type { PromptAdapter } from 'snipo';

const adapter: PromptAdapter = {
  interactive: false,
  async text({ message, default: fallback }) {
    return fallback ?? '';
  },
  async password() {
    return '';
  },
  async number({ default: fallback }) {
    return fallback ?? 0;
  },
  async confirm({ default: fallback }) {
    return fallback ?? false;
  },
  async select({ default: fallback }) {
    return fallback ?? '';
  },
  async multiselect() {
    return [];
  },
  async selectGenerator() {
    throw new Error('selection is not supported here');
  },
};
```

The contract has one boolean (`interactive`) and one method per prompt type. A
value supplied in `values` is read before the adapter is consulted, so a caller
can answer a prompt without calling `interactive: true`. With `interactive: false`
and no supplied value and no default, resolution throws instead of waiting for
input.

## Lifecycle hooks

`createRunHooks()` returns a `RunHookable` you can pass as `runGenerator({ hooks })`
or into `commitRun`. The hook names and payloads are public.

| Hook              | Fires                         | Payload                             |
| ----------------- | ----------------------------- | ----------------------------------- |
| `config:resolve`  | After the configuration loads | `configPath`, `configDir`, `config` |
| `prompts:resolve` | After answers resolve         | `generator`, `answers`              |
| `action:before`   | Before each action            | `action`, `index`, `context`        |
| `action:after`    | After each action             | `action`, `index`, `context`        |
| `write:before`    | Before the commit             | `context`, `files`                  |
| `write:after`     | After the commit              | `context`, `files`, `written`       |

Hooks run in series and can be async. A hook that throws aborts the run before any
file is committed, which makes them a place to add validation or logging without
risking a partial write. Each run gets its own registry by default, so hooks do
not leak between runs.

## Extending the action set

A wrapper can add action types of its own. Augment `SnipoActions` with the new
shape, then register a handler for its `type`. The handler receives the same
`RunContext` as the built-in handlers.

```ts
import { join } from 'node:path';
import { addTemplates, defineGenerator, type ActionHandlerRegistry } from 'snipo';
import { runGenerator, stageFile } from 'snipo/runtime';

declare module 'snipo' {
  interface SnipoActions {
    'acme/manifest': { readonly type: 'acme/manifest'; value: string };
  }
}

const generator = defineGenerator({
  name: 'service',
  basePath: 'services/<%= it.answers.name %>',
  actions: [
    addTemplates({ from: 'templates/service', to: '.' }),
    { type: 'acme/manifest', value: 'acme' },
  ],
});

const handlers: Partial<ActionHandlerRegistry> = {
  'acme/manifest': (action, context) => {
    stageFile(
      context,
      join(context.basePath, 'manifest.json'),
      JSON.stringify({ value: action.value }),
    );
  },
};

await runGenerator({ generator, configDir, moduleDir, answers, handlers });
```

Two rules keep this predictable:

- Supplied handlers merge over the built-in ones, so a custom handler never
  removes a built-in action. `createActionHandlers()` returns the built-ins as a
  `Partial<ActionHandlerRegistry>` if you want to spread them yourself.
- An action whose `type` has no registered handler fails the run before anything
  is written.

Augmentation is global per program, so namespace your action keys
(`acme/manifest`) to avoid colliding with another wrapper.

## Primitives for custom handlers

A custom handler builds output from the same primitives the built-in handlers use.
All are exported from `snipo/runtime`.

**Staging.** `stageFile(context, absolutePath, contents)` stages a generated file
and refuses to overwrite an existing one unless the run was forced. It treats two
writes to the same path inside one run as one file, so it will not flag an earlier
action's own output. `stageSourceFile` stages an intentional in-place edit and
skips the collision check. `commitRun(context, hooks)` writes the whole pool in
one pass and returns the written paths.

**Rendering.** `renderString(template, answers)` and
`renderTemplateContent(template, answers)` render Eta strings; `formatters` is the
`change-case` set; `expandTemplateSegment(segment, answers)` expands the brace
forms (`{name}`, `{formatter:name}`) used in file and directory names.

**Path containment.** `resolveWithinBase(baseDir, target, label?)` resolves a
target under the base directory and throws if it escapes. Run every output path
through it.

**Source edits.** `editImports(fileName, text, update)` and
`editExports(fileName, text, update)` are the AST-backed editors. The action
constructors `updateImports` and `updateExports` live at the root, so the runtime
exports the editors under distinct names. `SUPPORTED_SOURCE_EXTENSIONS` lists the
extensions they accept.

**Built-in handlers.** `applyAddTemplates`, `applyUpdateImports`, and
`applyUpdateExports` are the individual handlers; `createActionHandlers()` returns
all three keyed by action type.

**Flag parsing.** `parseGlobalFlags`, `parsePromptValues`, `argumentSpecFor`,
`flagNameFor`, and `RESERVED_FLAGS` back the CLI flag contract if a wrapper wants
the same mapping.

## Where the code lives

- `src/index.ts`: the root entry and its type re-exports.
- `src/runtime.ts`: the runtime entry and its function re-exports.
- `src/runtime/run-generator.ts`: `runGenerator` and `resolveBasePath`.
- `src/config/load-config.ts`, `src/config/discover-generators.ts`: discovery.
- `src/runtime/resolve-generator.ts`, `src/runtime/resolve-prompts.ts`,
  `src/runtime/hooks.ts`: resolution and lifecycle.
- `src/runtime/stage.ts`, `src/runtime/commit.ts`, `src/runtime/context.ts`,
  `src/runtime/paths.ts`: staging, commit, and containment.
- `src/runtime/render.ts`, `src/runtime/source-update.ts`: rendering and the AST
  editors.
- `src/runtime/handlers/`: the built-in action handlers.
- `src/actions/types.ts`: the open `Action` union and `SnipoActions`.

See [Architecture and how it works](./architecture.md) for how these pieces fit
together at runtime.
