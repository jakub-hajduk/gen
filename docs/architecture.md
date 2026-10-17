# Architecture and how it works

Snipo turns a declarative configuration file into a command line tool. A
project declares generators, each generator declares prompts and actions, and the
CLI resolves both the same way whether a person answers prompts in a terminal or
an agent passes the values as flags.

This page covers the moving parts: the entry points, the run pipeline, discovery,
the prompt contract, staged writes, source updates, and the libraries underneath.

## Three entry points

The package exposes three specifiers. They are split so a project pays only for
what it loads.

| Specifier       | What it gives you                                            | What it loads                 |
| --------------- | ------------------------------------------------------------ | ----------------------------- |
| `snipo`         | Declaration helpers and every public type                    | No runtime engines            |
| `snipo/runtime` | Functions that load, resolve, prompt, run, render, and stage | No interactive-prompt library |
| `snipo/cli`     | The `snipo` binary                                           | `@clack/prompts`              |

`defineConfig` and `defineGenerator` are typed identity helpers. `defineGenerator`
stamps the generator with `Symbol.for('snipo.generator')`, which discovery uses
to recognize it. Beyond the brand they add no runtime behavior, and they exist so
TypeScript can infer prompt keys into the action context
(`src/config/define-config.ts`, `src/config/define-generator.ts`).

A project that only declares generators imports `snipo` and stops there. The
runtime entry carries the engines and never imports the Clack adapter, so a
non-interactive consumer loads no prompt library. The binary is `./dist/cli.mjs`
(`package.json`). It imports `runCli`, maps a cancelled prompt to exit code `130`,
and any other failure to exit code `1` (`src/cli.ts:5`).

## How a run flows

`runCli` (`src/cli/run.ts:82`) is the whole pipeline. It runs these phases in
order and stops at the first error.

1. Parse global flags and the generator name (`parseGlobalFlags`).
2. Short-circuit `-h/--help` and `-v/--version`.
3. Find and load the nearest `snipo.config.*` (`loadSnipoConfig`).
4. Run the `config:resolve` hook.
5. Resolve which generator to run (`resolveGenerator`).
6. Collect prompt values from flags and prompts (`resolvePrompts`).
7. Run the `prompts:resolve` hook.
8. Execute the generator's actions and commit the staged writes (`runGenerator`).
9. Print a report of the written or planned files.

The generator name is the first argument when it does not start with a dash
(`src/cli/parse-args.ts:43`), so `snipo component --name "User Profile"`
resolves the `component` generator. Global flags parse in non-strict mode, so
unrelated flags pass through to the prompt parser.

## Configuration discovery

Discovery answers one question: which config does this invocation use, regardless
of the subdirectory the command runs from. It has two steps.

**Find the project boundary** (`findProjectBoundary`). Starting at the invocation
directory, the code walks up the tree and returns the first directory that looks
like a workspace root: one containing `pnpm-workspace.yaml`, `pnpm-workspace.yml`,
`lerna.json`, or `rush.json`, or a `package.json` with a `workspaces` field.
Failing that, it remembers the nearest ancestor with a `package.json`. If neither
exists, the invocation directory is the boundary.

**Find the nearest config up to that boundary** (`findNearestConfig`). It walks
from the invocation directory toward the boundary and checks each level for
`snipo.config` with these extensions in order: `.ts`, `.mts`, `.cts`, `.js`,
`.mjs`, `.cjs`, `.json`, `.jsonc`, `.json5`, `.yaml`, `.yml`, `.toml`. The first
match wins.

Two behaviors follow. Running inside a workspace package with no local config
falls back to the workspace-root config. A config inside a package takes
precedence over one at the workspace root, because the package is nearer. The
search never leaves the boundary.

`loadSnipoConfig` hands the config directory to c12 with comments, dotenv,
package.json, and rc-file sources disabled, and `configFileRequired: true`. It
requires `generators` to be an array of glob patterns and rejects a non-string
entry with an actionable error. A missing config names the starting directory and
the boundary; a malformed one names the resolved path.

## Generator discovery

Generators are not declared inline. `generators` is a flat array of glob
patterns, and `discoverGenerators` (`src/config/discover-generators.ts`) turns
them into the runtime's generator list:

1. `tinyglobby` expands each glob relative to the config directory.
2. `jiti` imports each matched module, TypeScript included.
3. Flatten descends default exports, named exports, nested arrays, and objects
   with a `generators` array.
4. Detect keeps only the objects branded by `defineGenerator`.
5. Dedupe removes the same object reached twice and fails on a name conflict.

Patterns run in array order and each pattern's matches sort by path, so discovery
is deterministic. A matched file that exports no generator is ignored. The same
generator reached through several patterns or a re-export is loaded once by
object identity, which works because discovery reuses one `jiti` instance. Two
distinct generators that share a `name` fail the run and report the files that
supplied them.

Each discovered generator keeps the directory of the module it came from
(`moduleDir`), which the runtime uses to resolve template sources. The loader
returns the raw `config` and the resolved `generators` separately, so the
`config:resolve` hook can still see the globs the user wrote.

## Generator selection

`resolveGenerator` (`src/runtime/resolve-generator.ts`) covers three cases:

- A name is supplied and matches a generator: use it.
- A name is supplied and matches nothing: fail and list the available names.
- No name is supplied: prompt for a selection when the adapter is interactive,
  otherwise fail and list the available names.

An empty resolved generator list fails immediately with its own message. The
interactive selection is delegated to the adapter (`selectGenerator`), so the
runtime never depends on Clack directly.

## One prompt contract, two adapters

A generator prompt is a plain data object (`src/prompts/types.ts`). Six
constructors build them: `text`, `password`, `number`, `confirm`, `select`, and
`multiselect`. Every definition shares `message`, `description`, `alias`,
`default`, `validate`, and `format`, plus type-specific fields such as `options`,
`min`, `max`, and `placeholder`.

The same object drives two things:

- The CLI flag parser derives a flag from the prompt key using kebab-case
  (`flagNameFor`), so `componentName` becomes `--component-name`.
- The interactive adapter maps the definition to the matching Clack prompt
  (`src/runtime/resolve-prompts.ts`).

`argumentSpecFor` turns the prompt map into a `node:util` `parseArgs` spec. The
mapping by type:

| Prompt type   | Value    | Flag shape                                     |
| ------------- | -------- | ---------------------------------------------- |
| `text`        | string   | `--name <value>`                               |
| `password`    | string   | `--token <value>`                              |
| `number`      | number   | `--count <value>`                              |
| `confirm`     | boolean  | `--enabled` / `--no-enabled`                   |
| `select`      | string   | `--framework <value>`                          |
| `multiselect` | string[] | `--tags a --tags b`, also accepts `--tags a,b` |

A prompt may set `alias` to add a short flag. Two namespaces are reserved, and a
prompt that clashes fails at spec-build time: the flags `dry-run`, `force`,
`help`, and `version`, and the short aliases `h` and `v`.

### Resolution order

`resolvePrompts` (`src/runtime/resolve-prompts.ts`) walks the prompt map in
declaration order and resolves each key with this precedence:

1. A supplied CLI value, parsed and validated with the prompt contract. It wins
   over a default and skips the prompt.
2. Otherwise, if the adapter is interactive, run the prompt and validate the
   answer.
3. Otherwise, if the definition has a `default`, use the default.
4. Otherwise, fail with an error naming the required flag.

Confirmed values are read from `--flag` and `--no-flag`. CLI `number` values are
range-checked against `min`/`max`; `select` and `multiselect` values are checked
against the declared options; `multiselect` accepts a comma-separated list or
repeated flags. Every path runs the prompt's `validate`, and the final value
passes through `format` before it lands in `answers`.

The Clack adapter (`src/cli/clack-adapter.ts`) decides interactivity from
`process.stdin.isTTY && process.stdout.isTTY` unless overridden. It converts a
Clack cancel into `PromptCancelledError`, which the entry point maps to exit code
`130`.

## Template generation

The `addTemplates({ from, to })` action copies a template tree into the target
project. Two renderers run, deliberately separate.

### Filesystem names use brace placeholders

Directory and file names expand with a brace syntax handled by
`expandTemplateSegment` (`src/runtime/render.ts`):

- `{name}` inserts the raw input value.
- `{formatter:name}` applies a `change-case` formatter, so `{pascalCase:name}`
  with `name: "user profile"` produces `UserProfile`.

The valid formatters are the string formatters from `change-case`: `camelCase`,
`capitalCase`, `constantCase`, `dotCase`, `kebabCase`, `noCase`, `pascalCase`,
`pathCase`, `sentenceCase`, `snakeCase`, and `trainCase`. A placeholder with no
matching input or an unknown formatter throws before anything is staged.

Braces are a filename syntax only. They are not Eta delimiters.

### Config strings and file contents use Eta

Generator configuration strings (the `to` destination, `file`, `from`, and
`members` values) and `.eta` file contents render with standard
[Eta](https://eta.js.org) delimiters via `renderTemplateContent`
(`src/runtime/render.ts`). The render context exposes:

- `it.answers`: resolved prompt values, keyed by prompt name.
- `it.format`: the same `change-case` formatter set.

Eta is constructed with `autoEscape: false` and `useWith: false`, so values are
not HTML-escaped and templates use `it.*` rather than bare names.

### The traversal

`applyAddTemplates` (`src/runtime/handlers/add-templates.ts`) runs these steps:

1. Resolve `from` against the directory of the module that defined the generator
   (`context.moduleDir`) and check it is a directory.
2. Render the `to` destination as an Eta template and check it stays inside the
   base path.
3. Walk the source tree recursively. Each file path splits into segments, every
   segment expands with the brace placeholders, and the segments rejoin.
4. If the resulting path ends in `.eta`, strip that suffix and render the file
   contents as an Eta template. Any other file is copied verbatim.
5. Check the final output path stays inside the base path, then stage the file.

Nested directories keep their structure. A `.eta` extension is only removed from
the end of the name.

### Base path containment

`resolveWithinBase` (`src/runtime/paths.ts`) resolves a target against the base
directory and computes the relative path back. An empty relative path means the
target is the base itself. A relative path of `..`, a path starting with `../`,
or an absolute path means the target escaped, and the call throws. Every rendered
destination, source file, and template output passes through this check, so a
template name or config string cannot write outside the generator's `basePath`.

### Read and write anchors

Paths are anchored on two separate axes:

- **Write**: `basePath` resolves from the config directory, and every output path
  stays inside it.
- **Read**: `addTemplates` `from` resolves from the generator's `moduleDir`, so a
  generator module carries its own templates. A module next to the config file
  resolves `from` exactly as before.

When the same generator is reached through several modules, its `moduleDir` is
the directory of the first module discovery observed, which is deterministic
because patterns run in order and matches sort by path.

## Staged writes and commit

Every generator run owns one Writepool instance (`src/runtime/context.ts`).
Actions write into that pool instead of touching disk. `commitRun`
(`src/runtime/commit.ts`) writes the whole pool in one pass, but only when the run
is not a dry run.

Three behaviors fall out of this design:

**Preview.** With `--dry-run`, `commitRun` skips the disk write and still reports
the staged paths. The command prints `Dry run for "<generator>": N file(s) would
be written.` and leaves the filesystem unchanged.

**Collision protection.** `stageFile` (`src/runtime/stage.ts`) refuses to
overwrite an existing file unless `--force` was supplied. It tracks what is
already staged, so two actions writing the same path inside one run are not a
collision. Intentional in-place edits use `stageSourceFile`, which skips the
collision check because source updates are expected to modify existing files.

**Read-through.** `context.read` returns staged content first and disk content
second. A source-update action therefore sees an earlier action's staged output
rather than the stale disk copy.

Because nothing is written until commit, a validation failure or a source parse
error anywhere in the run aborts before any file reaches disk.

## Module source updates

`updateImports` and `updateExports` edit `.ts`, `.tsx`, `.js`, and `.jsx` files
without reprinting the whole file. They use the TypeScript compiler API to parse
the source and produce targeted text replacements based on AST positions, which
preserves unrelated formatting and comments (`src/runtime/source-update.ts`).

Supported extensions live in `SUPPORTED_SOURCE_EXTENSIONS`. Any other extension
fails before staging. Parsing uses the matching `ScriptKind`, and a file with
syntax errors throws instead of being rewritten.

For imports:

- If a named import from the same module exists, the requested members merge into
  it. Existing members and additions dedupe by imported name and sort
  alphabetically. Aliased members keep their `imported as local` form. If nothing
  changed, the file is returned untouched.
- If no matching declaration exists, a new import is inserted after the last
  existing import declaration, or after a shebang line when no imports exist.
- Declaration order never changes. Side-effect-only imports have no named
  bindings, so they are never matched, merged, or moved.

For exports:

- A matching named export declaration gets the same merge-and-sort. Adding a
  member that already exists is a no-op.
- A missing declaration is inserted after the last export declaration, or at the
  end of the file with a trailing newline.
- The relative order of existing export declarations is preserved.

Both handlers render `from` and each `members` entry as Eta templates first, so
member names and module specifiers can be derived from prompt answers.

## Lifecycle hooks

The runtime exposes typed, awaitable lifecycle points built on Hookable
(`src/runtime/hooks.ts`). Calls run serially, and a hook error rejects the run
before commit.

| Hook              | Fires                  | Payload                             |
| ----------------- | ---------------------- | ----------------------------------- |
| `config:resolve`  | After the config loads | `configPath`, `configDir`, `config` |
| `prompts:resolve` | After answers resolve  | `generator`, `answers`              |
| `action:before`   | Before each action     | `action`, `index`, `context`        |
| `action:after`    | After each action      | `action`, `index`, `context`        |
| `write:before`    | Before the commit      | `context`, `files`                  |
| `write:after`     | After the commit       | `context`, `files`, `written`       |

`runActions` (`src/runtime/actions.ts`) calls `action:before`, looks up the
handler by action type, runs it, then calls `action:after`. An unknown action type
throws. Each generator run gets its own hook registry by default, so hooks do not
leak between runs.

These hooks are internal in this version. There is no public plugin registration
or hook-ordering API, but the payloads and lifecycle names are stable so a plugin
layer can be added later without redesigning the runtime.

## Libraries under the hood

| Library          | Used for                                         | Why it is used                                                                                                           |
| ---------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `c12`            | Loading the located `snipo.config.*`             | Loads the file, including TypeScript through `jiti`, after discovery finds it.                                           |
| `jiti`           | Importing generator modules                      | Runs TypeScript generator modules without a build step. One shared instance keeps object identity stable across imports. |
| `tinyglobby`     | Expanding `generators` glob patterns             | Smaller than `fast-glob` and more ergonomic than the experimental `fs.glob`.                                             |
| `eta`            | Rendering config strings and `.eta` contents     | Standard delimiters, so template authors use familiar syntax.                                                            |
| `change-case`    | `it.format` formatters and filename placeholders | One formatter set shared by filenames and contents. The brand is a fixed allow-list.                                     |
| `@clack/prompts` | Interactive terminal prompts                     | Only loaded by `snipo/cli`, so non-interactive consumers skip it.                                                        |
| `writepool`      | Staging every write before commit                | Enables dry runs, collision checks, and all-or-nothing commits.                                                          |
| `hookable`       | Lifecycle hook registry                          | Typed, awaitable, serial hooks.                                                                                          |
| `typescript`     | Parsing sources for the import/export editors    | AST positions let the editors change only the target declaration and preserve formatting.                                |

Two design choices are worth calling out. Discovery detects generators by a brand
symbol rather than duck-typing, so a config-shaped object cannot be mistaken for a
generator. Writes stage through the run context so reads see earlier staged
output, which is what lets a source update see files another action just created.

## Where the code lives

- `src/cli.ts`: binary entry point and exit codes.
- `src/cli/run.ts`: the run pipeline.
- `src/cli/parse-args.ts`: global flags and prompt-to-flag parsing.
- `src/cli/prompt-adapter.ts`, `src/cli/clack-adapter.ts`: the interaction seam
  and its Clack implementation.
- `src/config/`: the declaration helpers, config discovery, and generator-module
  discovery (`discover-generators.ts`).
- `src/prompts/`: the prompt contract and constructors.
- `src/actions/`: action types and constructors.
- `src/runtime/`: context, staging, commit, rendering, hooks, generator
  resolution, and action handlers.
- `src/runtime/source-update.ts`: the AST-backed import and export editor.
