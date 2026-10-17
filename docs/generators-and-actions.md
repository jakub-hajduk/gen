# Generators and actions

A generator is a named unit of work with three parts: the inputs it collects
(`prompts`), the folder it writes under (`basePath`), and the ordered changes it
makes (`actions`). This page is the reference for all three, plus templates and
custom actions.

For a guided walkthrough that ends in a running command, read
[Getting started](./getting-started.md) first.

## The generator shape

```ts
import { addTemplates, defineGenerator, text } from 'snipkit';

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
  ],
});
```

| Field | Required | Meaning |
| --- | --- | --- |
| `name` | yes | The CLI command name. The file name never affects it. |
| `description` | no | Shown in the generator selection list. |
| `basePath` | yes | Non-empty static path. Every file the generator writes stays below it. Resolved from the directory that holds `snipkit.config.*`, not the process CWD. |
| `prompts` | no | Map of input name to prompt definition. |
| `actions` | yes | Ordered list of changes to stage. |

A module can export one generator, several named generators, an array, or an
object with a `generators` array, and can mix those. Nested arrays flatten.
Modules that export no generator are ignored. A generator reached through more
than one pattern or a re-export loads once, and two distinct generators that share
a `name` fail the run. See [Architecture](./architecture.md) for the discovery
rules.

## Prompts

Each prompt definition produces both a Clack interaction and a CLI flag. The flag
is the kebab-case form of the prompt key, so `componentName` becomes
`--component-name`. A supplied flag value is parsed and validated by the same
prompt contract and skips the interaction.

| Constructor | Value | CLI flag |
| --- | --- | --- |
| `text` | string | `--name <value>` |
| `password` | string | `--token <value>` |
| `number` | number | `--count <value>` |
| `confirm` | boolean | `--enabled` / `--no-enabled` |
| `select` | string | `--framework <value>` |
| `multiselect` | string[] | `--tags a --tags b` or `--tags a,b` |

```ts
prompts: {
  name: text({ message: 'Component name', placeholder: 'UserProfile' }),
  token: password({ message: 'Registry token' }),
  count: number({ message: 'How many?', min: 1, max: 10, default: 1 }),
  enabled: confirm({ message: 'Enable story?', default: false }),
  framework: select({ message: 'Framework', options: ['react', 'vue'] }),
  tags: multiselect({
    message: 'Tags',
    options: [{ value: 'ui', label: 'UI', hint: 'Reusable' }, 'form'],
  }),
}
```

Common options on every constructor:

| Option | Purpose |
| --- | --- |
| `message` | Required prompt text. |
| `description` | Extra context shown with the prompt. |
| `alias` | Short flag, for example `alias: 'n'` gives `-n`. |
| `default` | Value used interactively as a suggestion and non-interactively when the flag is missing. |
| `validate` | Returns `true` or an error string. Runs on every path, including supplied flags. |
| `format` | Transforms the final value before it lands in `answers`. |

Type-specific fields: `text` takes `placeholder`; `number` and `multiselect` take
`min` and `max`; `select` and `multiselect` take `options`, where an option is a
string or `{ value, label?, hint? }`.

A missing value with no default fails the run and names the CLI flag. Intended
aliases `h`, `v` and the flags `dry-run`, `force`, `help`, `version` are reserved;
a prompt that uses one fails when the flag spec is built.

## Actions

Actions run in the order you list them and stage their output into one commit.
The built-in set covers adding files and editing module imports and exports.

### `addTemplates({ from, to })`

Recursively copies the `from` directory (relative to the module that defines the
generator) into `to` (relative to the generator `basePath`). A file ending in
`.eta` is rendered and written without that final extension; other files are
copied verbatim.

```ts
addTemplates({
  from: 'templates/component',
  to: 'components/<%= it.format.kebabCase(it.answers.name) %>',
})
```

### `updateImports({ file, from, members, typeOnly? })`

Merges the named `members` into the import declaration for the `from` module in
`file` (relative to the `basePath`) and alphabetizes the members. Supported files
are `.ts`, `.tsx`, `.js`, and `.jsx`. Existing declarations keep their order, and
side-effect-only imports are never merged or moved. A missing module declaration
is added as a new import after the existing imports.

```ts
updateImports({
  file: 'components/index.ts',
  from: './<%= it.format.kebabCase(it.answers.name) %>',
  members: ['<%= it.format.pascalCase(it.answers.name) %>'],
})
```

Set `typeOnly: true` to emit an `import type` declaration.

### `updateExports({ file, from, members, typeOnly? })`

Merges the named `members` into the export declaration for the `from` module and
alphabetizes them while preserving the order of existing export declarations.
Adding the same member twice is a no-op. It accepts the same file types and
`typeOnly` flag as `updateImports`.

### Ordering and staging

All actions stage into one Writepool and commit together. An `addTemplates` that
creates a file can be read by a later `updateExports`, because the run context
reads staged content before disk content. Nothing reaches disk until every action
succeeds, so a failure late in the run leaves the project unchanged. See
[Staged writes and commit](./architecture.md#staged-writes-and-commit).

## Templates

### Eta delimiters and the render context

Generator configuration strings and `.eta` file contents use standard
[Eta](https://eta.js.org) delimiters. The render context exposes:

- `it.answers`: the resolved prompt values, keyed by prompt name.
- `it.format`: the `change-case` formatters (`pascalCase`, `kebabCase`,
  `camelCase`, `snakeCase`, and more).

```tsx
export const <%= it.format.pascalCase(it.answers.name) %> = () => <div />;
```

### Filesystem name placeholders

Directory and file names inside a `from` template tree expand two placeholder
forms before writing:

- `{name}` inserts the raw input value.
- `{formatter:name}` applies a `change-case` formatter, so
  `{pascalCase:name}.tsx.eta` becomes `UserProfile.tsx`.

A placeholder with no matching input or an unknown formatter fails the run
before anything is committed. Braces work in names only, not in file contents.

### A complete template tree

```
generators/
  component.generator.ts
  templates/component/
    {pascalCase:name}.tsx.eta
    index.ts.eta
```

`templates/component/{pascalCase:name}.tsx.eta`:

```tsx
export const <%= it.format.pascalCase(it.answers.name) %> = () => <div />;
```

`templates/component/index.ts.eta`:

```ts
export * from './<%= it.format.kebabCase(it.answers.name) %>';
```

## Extending the action set

The action list is open. Declare a new action shape by augmenting the
`SnipkitActions` interface, then register a handler for its type. Custom handlers
receive the same run context as the built-in ones, so they can read `answers`,
read content staged earlier in the run, and stage output into the same commit.

```ts
import { join } from 'node:path';
import { addTemplates, defineGenerator, type ActionHandlerRegistry } from 'snipkit';
import { runGenerator, stageFile } from 'snipkit/runtime';

declare module 'snipkit' {
  interface SnipkitActions {
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

Supplied handlers merge over the built-in ones, so registering a custom handler
keeps every built-in action runnable. An action whose type has no registered
handler fails the run before anything is written. Namespace the action key per
tool (`acme/manifest`) so two wrappers that augment the same program do not
collide.

The primitives a custom handler uses (staging, rendering, path containment, and
the AST editors) are listed in
[Programmatic API](./programmatic-api.md#primitives-for-custom-handlers).

## Global flags and safe writes

These flags work on every generator:

- `--dry-run`: report the files that would be written without writing them.
- `--force`: replace existing files that collide with generated output.
- `-h, --help`: print usage.
- `-v, --version`: print the version.

An existing file collides and fails the run unless `--force` is supplied. Output
paths are normalized and rejected if they escape `basePath`.
