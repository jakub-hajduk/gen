# snipo

A modular toolkit for snippet-based code generation. Define generators once and
run them interactively or from automation with the same inputs.

## Install

```sh
pnpm add -D snipo
```

## Quick start

Create `snipo.config.ts` at your project root. It points at the glob patterns
Snipo uses to discover generator modules:

<!-- example:config -->

```ts
import { defineConfig } from 'snipo';

export default defineConfig({
  generators: ['./generators/*.generator.ts'],
});
```

Add a generator module. A discovered file can export one generator, an array of
generators, or an object with a `generators` array:

<!-- example:generator -->

```ts
import { addTemplates, defineGenerator, text, updateExports } from 'snipo';

export default defineGenerator({
  name: 'component',
  description: 'Create a component and update the barrel export',
  basePath: 'src',
  prompts: {
    name: text({ message: 'Component name', placeholder: 'UserProfile' }),
  },
  actions: [
    addTemplates({
      from: 'templates/component',
      to: 'components/<%= it.format.kebabCase(it.answers.name) %>',
    }),
    updateExports({
      file: 'components/index.ts',
      from: './<%= it.format.kebabCase(it.answers.name) %>',
      members: ['<%= it.format.pascalCase(it.answers.name) %>'],
    }),
  ],
});
```

Add the templates next to the generator. `from` resolves relative to the module
that defines the generator, so `templates/component` lives beside it in
`generators/`. The file name inside the braces is a placeholder; see
[Filesystem name placeholders](#filesystem-name-placeholders).

`generators/templates/component/{pascalCase:name}.tsx.eta`:

<!-- example:template-component -->

```tsx
export const <%= it.format.pascalCase(it.answers.name) %> = () => <div />;
```

`generators/templates/component/index.ts.eta`:

<!-- example:template-index -->

```ts
export * from './<%= it.format.kebabCase(it.answers.name) %>';
```

Create the barrel that the generator updates, `src/components/index.ts`:

<!-- example:barrel -->

```ts
// Components barrel
```

Run the generator with every value supplied as a flag:

```sh
pnpm snipo component --name "User Profile"
```

Because every prompt value is supplied, the command runs without prompting,
writes the component tree below `src/components/user-profile`, and appends the
export to `src/components/index.ts`:

```ts
// Components barrel
export { UserProfile } from './user-profile';
```

Run `pnpm snipo component` from a terminal instead to be prompted for the name.

## Configuration

`defineConfig` takes an object with a `generators` array of glob patterns.
Snipo expands each pattern from the directory that contains `snipo.config.*`,
imports every matching module, and flattens its exports into a list of
generators. A module may default-export one generator, an array of generators, or
an object with a `generators` array, and may also name-export generators; nested
arrays are flattened. Modules that export no generator are ignored, and a
generator reached through more than one pattern or re-export is loaded once. Two
distinct generators that share a `name` fail the run.

`defineGenerator` returns a generator with:

- `name` (required): the CLI command name. The file name never affects it.
- `description` (optional): shown in the generator selection list.
- `basePath` (required): a static path, resolved from the directory that
  contains `snipo.config.*`. Every file a generator writes stays below it.
- `prompts` (optional): a map of input name to prompt definition.
- `actions` (required): the ordered list of changes to stage.

## Prompts and CLI flags

Each prompt definition produces both a Clack interaction and a CLI flag. The
flag is the kebab-case form of the prompt key (`componentName` becomes
`--component-name`). A supplied flag value is parsed and validated by the same
prompt contract and skips the interaction.

| Constructor   | Value    | CLI flag                            |
| ------------- | -------- | ----------------------------------- |
| `text`        | string   | `--name <value>`                    |
| `password`    | string   | `--token <value>`                   |
| `number`      | number   | `--count <value>`                   |
| `confirm`     | boolean  | `--enabled` / `--no-enabled`        |
| `select`      | string   | `--framework <value>`               |
| `multiselect` | string[] | `--tags a --tags b` or `--tags a,b` |

Common options: `message`, `description`, `alias` (short flag), `default`,
`validate`, and `format`. A `default` is shown during an interactive run and
used for a missing value in a non-interactive run. A missing value with no
default fails and names the CLI flag.

Global flags:

- `--dry-run`: report the files that would be written without writing them.
- `--force`: replace existing files that collide with generated output.
- `-h, --help`: print usage.
- `-v, --version`: print the version.

## Actions

### `addTemplates({ from, to })`

Recursively copies the `from` directory (relative to the module that defines the
generator) into `to` (relative to the generator `basePath`). A file ending in
`.eta` is rendered and written without that final extension; other files are
copied verbatim.

### `updateImports({ file, from, members, typeOnly? })`

Merges the named `members` into the import declaration for the `from` module in
`file` (relative to the `basePath`) and alphabetizes the members. Supported
files are `.ts`, `.tsx`, `.js`, and `.jsx`. Existing declarations keep their
order, and side-effect-only imports are never merged or moved. A missing module
declaration is added as a new import after the existing imports.

### `updateExports({ file, from, members, typeOnly? })`

Merges the named `members` into the export declaration for the `from` module
and alphabetizes them while preserving the order of existing export
declarations. Adding the same member twice is a no-op.

## Extending actions

The action set is extensible. Declare a new action shape by augmenting the
`SnipoActions` interface, then register a handler for its type. Custom handlers
receive the same run context as the built-in ones, so they can read `answers`,
read content staged earlier in the run, and stage output into the same commit.

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

Supplied handlers are merged over the built-in handlers, so registering a custom
handler keeps every built-in action runnable. Namespace the action key per tool
(`acme/manifest`) so two wrappers that augment the same program do not collide.

## Templates

Generator configuration strings and `.eta` file contents use standard
[Eta](https://eta.js.org) delimiters. The render context exposes:

- `it.answers`: the resolved prompt values, keyed by prompt name.
- `it.format`: the `change-case` formatters (`pascalCase`, `kebabCase`,
  `camelCase`, `snakeCase`, and more).

```ts
'<%= it.format.pascalCase(it.answers.name) %>';
```

### Filesystem name placeholders

Directory and file names inside a `from` template tree expand two placeholder
forms before writing:

- `{name}` inserts the raw input value.
- `{formatter:name}` applies a `change-case` formatter, for example
  `{pascalCase:name}.tsx.eta` becomes `UserProfile.tsx`.

A placeholder with no matching input or an unknown formatter fails the run
before anything is committed.

## Safe writes

All generated files and source updates are staged first and written together at
the end of the run. Output paths are normalized and rejected if they escape the
generator `basePath`. An existing file collides and fails the run unless
`--force` is supplied. With `--dry-run` the staged set is reported and nothing
is written.

## Programmatic usage

Import the engine from `snipo/runtime` to run generators from another tool.
The root (`snipo`) stays free of runtime dependencies and exports the shared
types, so a project that only declares generators loads no engine.

```ts
import { addTemplates, defineGenerator, text, type PromptAdapter } from 'snipo';
import { loadSnipoConfig, resolveGenerator, resolvePrompts, runGenerator } from 'snipo/runtime';

const generator = defineGenerator({
  name: 'component',
  basePath: 'src',
  prompts: { name: text({ message: 'Component name' }) },
  actions: [addTemplates({ from: 'templates/component', to: '.' })],
});

// Run a code-defined generator without a snipo.config.* file. `configDir`
// anchors `basePath`; `moduleDir` anchors template `from`.
await runGenerator({
  generator,
  configDir: process.cwd(),
  moduleDir: process.cwd(),
  answers: { name: 'Button' },
});

// Or drive the config-discovery pipeline yourself with a PromptAdapter.
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

`snipo/runtime` also exposes the loader, resolver, hooks, staging and
rendering primitives, the built-in action handlers, and the AST editors
(`editImports`/`editExports`). The CLI entry and its Clack adapter stay in
`snipo/cli`, so a non-interactive consumer never loads the prompt library.
