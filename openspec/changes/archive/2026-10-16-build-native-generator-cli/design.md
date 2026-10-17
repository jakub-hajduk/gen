# Design

## Context

The staged source tree contains a prototype that couples Commander, `prompts`, a custom configuration importer, and direct generation logic. The new runtime needs a small public declaration API, ESM-native configuration loading, deterministic automation, and transaction-like file changes. See `proposal.md` for motivation and the three delta specs for behavior.

## Goals / Non-Goals

**Goals:**

- Make one typed prompt definition drive both CLI argument parsing and Clack interaction.
- Keep each generator's filesystem changes contained below a static, configuration-relative base path.
- Make template generation and source updates one staged write set with a preview mode.
- Preserve existing module declaration order while making common import/export additions idempotent.
- Keep lifecycle hooks internal but expose coherent stage boundaries for a future plugin API.

**Non-Goals:**

- Public plugin registration, hook ordering configuration, or plugin compatibility in the NVP.
- Plopfile, Handlebars, Inquirer, or CommonJS compatibility.
- Source updating for JSON, YAML, CSS, or arbitrary text files.
- Arbitrary JavaScript evaluation in filesystem template names.
- Remote template registries and the prototype's snippet-cache workflow.

## Decisions

### Configuration discovery and declaration API

Use c12 to load the nearest `snipkit.config.*` within a detected project boundary. Detect a workspace root from workspace metadata; otherwise use the nearest ancestor with `package.json`. Search from the invocation directory upward and select the first configuration found. Do not provide a command-line config override in the NVP.

Expose `defineConfig` and `defineGenerator` as typed identity helpers. A generator requires a static `basePath`, `prompts`, and `actions`; `basePath` resolves from the loaded configuration directory rather than process CWD.

Alternative considered: resolve paths from process CWD. Rejected because a generator would create different output from subdirectories, CI, and agent workspaces.

### One prompt contract with two adapters

Represent built-in prompt types declaratively, including their key, description, default, validation, and type-specific metadata. The CLI adapter derives flags, parsing, and validation. The Clack adapter invokes the matching native prompt only for values absent from CLI input in an interactive terminal.

Use an explicit custom-prompt escape hatch only when the built-in contract cannot represent a Clack interaction; it must supply equivalent CLI parsing metadata. Prompt defaults remain visible in interactive runs, while CLI values bypass prompts.

Alternative considered: store an awaited Clack invocation in generator configuration. Rejected because it executes while importing configuration and cannot reveal CLI metadata.

### Template tree processing has separate name and content renderers

`addTemplates` traverses a source directory and stages each output file below a rendered destination within `basePath`. It uses two deliberately separate renderers:

- Physical template path segments expand only `{key}` and `{formatter:key}`. Formatter names are the supported string formatters exported by `change-case`; unknown formatters and missing values fail before commit.
- Generator configuration strings and `.eta` file contents use standard Eta syntax. The render context uses `it.answers` for resolved inputs and `it.format` for the same `change-case` formatter set.

The final `.eta` extension is removed from output filenames. Rendered paths are normalized and checked against the resolved base directory before entering the staged write set.

Alternative considered: configure Eta with brace delimiters for paths. Rejected because braces are a filesystem-name syntax only and configuration/template content must retain standard Eta delimiters.

### One staged run and explicit collision policy

Create one Writepool instance per generator run. All template output and source updates operate on that instance, then a single commit writes it to disk. `--dry-run` reports the staged set only. Generated-file collisions are errors unless the global `--force` flag is supplied.

The runtime uses internal typed Hookable lifecycle points around configuration resolution, prompt resolution, each action, and writing. Hook calls are awaited serially. Hook errors reject the run before commit. No plugin API or hook-order setting is exposed in this version.

Alternative considered: write each action immediately. Rejected because later validation or source-update failure could leave a partially generated project.

### Conservative module source updates

Use the TypeScript compiler API to parse `.ts`, `.tsx`, `.js`, and `.jsx` sources and produce targeted text edits based on AST locations rather than printing an entire source file. This preserves unrelated formatting and comments.

For an existing module declaration, import/export member additions merge into it and sort named members alphabetically. New module declarations are inserted without reordering existing declarations. Side-effect-only imports are never merged, moved, or reordered.

Alternative considered: globally sort declarations. Rejected because changing import order can change module side-effect evaluation.

## Risks / Trade-offs

- [c12 configuration may execute project TypeScript] -> Treat configuration as trusted local project code and report its load errors with the resolved path.
- [Filename placeholders can produce unsafe paths] -> Accept only named values and approved `change-case` formatters, normalize rendered paths, and enforce the base-path boundary.
- [Writepool staging may not make all reads observe previous staged writes automatically] -> Route action reads through the run context so source updates see staged content before disk content.
- [TypeScript AST edits can be difficult for unusual import syntax] -> Support explicit common import/export forms first, fail with a precise unsupported-shape error, and retain the original source unchanged.
- [No public plugins limits initial customization] -> Keep typed internal hook payloads and stable lifecycle names so a later plugin layer can be added without redesigning the runtime.

## Migration Plan

1. Replace the prototype runtime entry point and public declarations with the new generator runtime.
2. Move required runtime libraries into package dependencies and publish an ESM CLI binary plus library exports.
3. Add fixture generators that cover interactive, non-interactive, dry-run, collision, template-name, and module-update behavior.
4. Verify the new CLI against those fixtures before publishing.

Rollback is a package-version rollback: the NVP introduces no persisted state or migration of generated projects.
