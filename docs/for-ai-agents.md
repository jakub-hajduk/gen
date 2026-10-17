# For AI agents

This page tells an agent how to use Snipkit to generate code from boilerplate,
how to build new generators, and how to work inside the Snipkit repository. Read
[Generators and actions](./generators-and-actions.md) for the full option
reference; this page is the operating procedure.

## Non-interactive rules

Follow these rules first. They prevent a run from hanging or overwriting files.

1. Pass every prompt value as a flag. Outside a TTY, a missing required value
   fails and names the flag. Do not rely on prompts.
2. Run with `--dry-run` before the real run and check the file list.
3. Do not pass `--force` unless the user asked to replace existing files. Without
   it, a collision fails the run safely.
4. Run from inside the project. Snipkit finds the nearest `snipkit.config.*` by
   walking up, so run from the project root or a subdirectory of it.

The command shape is:

```sh
snipkit <generator> [--prompt-flags] [--dry-run] [--force]
```

Use `pnpm snipkit ...` or `npx snipkit ...` when the binary is not global.

## Step 1: Find the generators and their inputs

Read `snipkit.config.*` for the `generators` glob patterns, then read the matched
`*.generator.ts` modules. Each module's `defineGenerator` call gives you
everything you need:

- `name`: the command name to run.
- `prompts`: the input keys. Each key becomes a `--kebab-case` flag.
- `actions`: what the run will do.

If you cannot read the files, run the binary with no generator name in a
non-interactive shell. It fails and lists the available names.

```sh
snipkit
# Error: ... Available generators: component, service, ...
```

## Step 2: Run an existing generator

Build the flag list from the generator's `prompts`, then dry-run.

```sh
snipkit component --name "User Profile" --dry-run
```

The dry run prints every path it would write and changes nothing:

```
Dry run for "component": 2 file(s) would be written.
  /abs/path/src/components/user-profile/UserProfile.tsx
  /abs/path/src/components/index.ts
```

If the list matches the goal, drop `--dry-run` to write the files.

## Prompt-to-flag map

| Prompt constructor | Flag shape                                  |
| ------------------ | ------------------------------------------- |
| `text`             | `--name "User Profile"`                     |
| `password`         | `--token "..."`                             |
| `number`           | `--count 3`                                 |
| `confirm`          | `--enabled` or `--no-enabled`               |
| `select`           | `--framework react`                         |
| `multiselect`      | `--tags ui --tags form` or `--tags ui,form` |

The flag is the kebab-case form of the prompt key: a prompt keyed `componentName`
becomes `--component-name`. Check the generator file for the exact keys, defaults,
and `select` options before constructing a command.

## Step 3: Build a new generator

Create three things: an entry in the config glob, a generator module, and its
templates.

### 3a. Confirm the config glob

`snipkit.config.ts` points at your generator files. If the pattern already covers
the new file, change nothing.

```ts
import { defineConfig } from 'snipkit';

export default defineConfig({
  generators: ['./generators/*.generator.ts'],
});
```

### 3b. Write the generator module

Put it at a path the glob matches, for example
`generators/service.generator.ts`.

```ts
import { addTemplates, defineGenerator, select, text, updateExports } from 'snipkit';

export default defineGenerator({
  name: 'service',
  description: 'Create an API service and register it',
  basePath: 'src',
  prompts: {
    name: text({ message: 'Service name', placeholder: 'Billing' }),
    transport: select({ message: 'Transport', options: ['http', 'grpc'] }),
  },
  actions: [
    addTemplates({
      from: 'templates/service',
      to: 'services/<%= it.format.kebabCase(it.answers.name) %>',
    }),
    updateExports({
      file: 'services/index.ts',
      from: './<%= it.format.kebabCase(it.answers.name) %>',
      members: ['create<%= it.format.pascalCase(it.answers.name) %>Service'],
    }),
  ],
});
```

`basePath` is where output is written and resolves from the config directory.
`from` resolves from the generator module's own directory, so templates usually
sit in a `templates/` folder next to the module.

### 3c. Add the templates

For a generator at `generators/service.generator.ts` with
`from: 'templates/service'`, create files under
`generators/templates/service/`.

`templates/service/{pascalCase:name}.service.ts.eta`:

```ts
export function create<%= it.format.pascalCase(it.answers.name) %>Service() {
  return { transport: '<%= it.answers.transport %>' };
}
```

`templates/service/index.ts.eta`:

```ts
export * from './<%= it.format.kebabCase(it.answers.name) %>.service';
```

If an action edits an existing file (like `services/index.ts` above), create that
target file before the first run.

### 3d. Verify the new generator

```sh
snipkit service --name "Billing" --transport http --dry-run
snipkit service --name "Billing" --transport http
```

## Template syntax

Two syntaxes exist and they do not mix.

- **File and directory names** use braces: `{name}` inserts the raw value,
  `{pascalCase:name}` applies a `change-case` formatter. The `.eta` suffix is
  stripped from output.
- **File contents and config strings** (`to`, `file`, `from`, `members`) use Eta:
  `<%= it.answers.name %>` and `<%= it.format.pascalCase(it.answers.name) %>`.

Available `it.format` formatters include `pascalCase`, `camelCase`, `kebabCase`,
`snakeCase`, `constantCase`, `capitalCase`, `sentenceCase`, and `pathCase`.

## Action cheat sheet

| Goal                                        | Action                                              |
| ------------------------------------------- | --------------------------------------------------- |
| Copy a template tree into the project       | `addTemplates({ from, to })`                        |
| Add or merge named imports in a source file | `updateImports({ file, from, members, typeOnly? })` |
| Add or merge named exports in a source file | `updateExports({ file, from, members, typeOnly? })` |

Source updates support `.ts`, `.tsx`, `.js`, and `.jsx` only. Adding a member
that already exists does nothing, so these edits are safe to repeat.

## Generate code without the CLI

When spawning a process is awkward, import the runtime and pass answers directly.
No config file and no TTY are required.

```ts
import { addTemplates, defineGenerator } from 'snipkit';
import { runGenerator } from 'snipkit/runtime';

const generator = defineGenerator({
  name: 'component',
  basePath: 'src',
  actions: [addTemplates({ from: 'templates/component', to: 'components/<%= it.answers.name %>' })],
});

const result = await runGenerator({
  generator,
  configDir: process.cwd(),
  moduleDir: process.cwd(),
  answers: { name: 'Button' },
  dryRun: true,
});

result.files; // planned absolute paths; nothing written when dryRun is true
```

Set `answers` for every prompt the generator declares, then run again with
`dryRun: false` to write. See
[Programmatic API](./programmatic-api.md) to drive configuration discovery and
load generators from a project instead of defining them in code.

## Invariants you can rely on

- **Staged writes.** Output is staged and committed together. A failure in any
  action means no file is written, so a failed run leaves the project untouched.
- **Collision safety.** An existing file fails the run unless `--force` is set.
- **Containment.** Every output path is checked against `basePath`. A template
  name cannot escape it.
- **Deterministic discovery.** Glob patterns run in array order, matched files
  sort by path, and two generators with the same `name` fail the run.
- **Idempotent source edits.** Re-adding an existing import or export member is a
  no-op.

## Working on Snipkit itself

When the task is to change the Snipkit package, not to use it, run these from the
repository root:

```sh
pnpm build       # bundle dist/ via tsdown
pnpm typecheck   # tsc --noEmit
pnpm test        # node --test via tsx
pnpm lint        # oxlint
pnpm check       # oxlint + oxfmt --check + tsc --noEmit
pnpm fix         # oxlint --fix + oxfmt --write
```

Before finishing a change, run `pnpm check` and `pnpm test`. Keep the public entry
points (`snipkit`, `snipkit/runtime`, `snipkit/cli`) coherent with the specs in
`openspec/specs/`.

## Checklist

1. Read the config and the target generator before running anything.
2. Supply every prompt as a flag.
3. Dry-run and confirm the file list.
4. Run for real; use `--force` only when the user asked to replace files.
5. After a code change to Snipkit, run `pnpm check` and `pnpm test`.
