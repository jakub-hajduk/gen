# Getting started

This guide takes an empty project to a working generator you can run from a
terminal or from automation.

## 1. Install

Snipo is an ESM package that provides a `snipo` binary.

```sh
pnpm add -D snipo
```

`npm install -D snipo` and `yarn add -D snipo` work the same way. The binary
is available as `snipo` once installed. Run it through your package manager
(`pnpm snipo ...`) or `npx snipo ...` and you do not need a global install.

## 2. Point Snipo at your generators

Create `snipo.config.ts` at your project root. `defineConfig` takes a
`generators` array of glob patterns. Snipo expands each pattern from the
directory that holds the config file, imports every matching module, and loads
the generators it exports.

```ts
import { defineConfig } from 'snipo';

export default defineConfig({
  generators: ['./generators/*.generator.ts'],
});
```

Put a generator in a file the pattern matches:

```ts
import { addTemplates, defineGenerator, text } from 'snipo';

export default defineGenerator({
  name: 'component',
  description: 'Create a component file',
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

What each field does:

- `name`: the command you type, so this generator runs as `snipo component`.
  The file name never affects the command.
- `description`: shown when the CLI asks which generator to run.
- `basePath`: the folder every generated file is written under. It resolves
  relative to the directory that holds `snipo.config.ts`, not your current
  working directory, so output is identical from any subdirectory.
- `prompts`: the inputs the generator collects. The key `name` becomes the
  `--name` flag and the prompt shown in a terminal.
- `actions`: the ordered list of changes to make.

Snipo finds the nearest `snipo.config.*` by walking up from where you run the
command. `snipo.config.ts` is the usual choice, but `.js`, `.mjs`, `.json`,
`.yaml`, and other extensions work too. In a monorepo the search stops at the
workspace root, so a package with no local config inherits the root config.

## 3. Build a simple generator

A generator pairs prompt inputs with actions. This walkthrough creates a
component generator that copies a template and derives the output name from the
prompt.

### Add a template

Templates live in a directory you reference with `from`. `from` resolves relative
to the module that defines the generator, so a generator in
`generators/component.generator.ts` reads its templates from `generators/`. Inside
the template directory, the file path is a template too. Create
`generators/templates/component/{pascalCase:name}.tsx.eta`:

```tsx
export const <%= it.format.pascalCase(it.answers.name) %> = () => <div />;
```

Two naming rules apply:

- The `.eta` extension is stripped from the output. This template writes
  `UserProfile.tsx`, not `UserProfile.tsx.eta`.
- Filesystem placeholders use braces. `{pascalCase:name}` runs the `name` answer
  through the `pascalCase` formatter. `{name}` would insert the raw value.

File contents and configuration strings use standard [Eta](https://eta.js.org)
delimiters, where `it.answers` holds your prompt values and `it.format` holds the
`change-case` formatters (`pascalCase`, `kebabCase`, `camelCase`, `snakeCase`,
and more).

### Add a second action

Generators rarely only add files. To append an export to a barrel file, add an
`updateExports` action after `addTemplates`:

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

Create the target file the action updates, `src/components/index.ts`:

```ts
// Components barrel
```

### Run it

Supply every prompt value as a flag to run without prompts:

```sh
pnpm snipo component --name "User Profile"
```

Snipo writes `src/components/user-profile/UserProfile.tsx` and appends the
export to `src/components/index.ts`, which now reads:

```ts
// Components barrel
export { UserProfile } from './user-profile';
```

Run `pnpm snipo component` from a terminal instead and it prompts for the name.
If you omit a required flag outside a terminal, the command fails and names the
flag you need to pass.

### Check before you write

Pass `--dry-run` to list the files a run would produce without touching disk:

```sh
pnpm snipo component --name "Billing" --dry-run
```

If a generated path already exists, the run fails rather than overwriting it.
Pass `--force` when you intend to replace those files. Every file is staged
during a run and written together at the end, so a failure partway through leaves
your project unchanged.

## Next steps

- [Generators and actions](./generators-and-actions.md) is the reference for
  every prompt constructor, the three built-in actions, and how to add your own.
- [Architecture and how it works](./architecture.md) explains config discovery,
  the prompt-to-flag contract, staged writes, and the AST source updates.
- [Programmatic API](./programmatic-api.md) runs generators from another Node
  program instead of the terminal.
- [For AI agents](./for-ai-agents.md) is the non-interactive playbook.
