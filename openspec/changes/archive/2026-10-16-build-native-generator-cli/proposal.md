# Proposal

## Why

Snipkit needs a cohesive ESM-native generator runtime instead of the incomplete prototype built around multiple unrelated CLI and prompt libraries. The runtime must be usable both interactively and non-interactively so people and AI agents can create the same project changes deterministically.

## What Changes

- Add a c12-loaded `snipkit.config.*` configuration model with declarative generators and a required static `basePath` per generator.
- Add a Clack-powered CLI that selects generators interactively when a TTY is available and accepts every prompt value as a CLI flag for non-interactive use.
- Add a template generation workflow that stages multi-file output in Writepool, renders file contents with Eta, and expands filesystem template names with `change-case` formatters.
- Add safe write controls: dry runs by default do not mutate files, collisions fail unless `--force` is supplied, and all generated paths remain under the generator base path.
- Add AST-backed TypeScript and JavaScript import/export update actions that merge and alphabetize members without reordering module declarations or side-effect imports.
- Replace the prototype's prompt, CLI, configuration, and file-output integrations with Clack, c12, Eta, Writepool, and internal awaitable lifecycle hooks.

## Capabilities

### New Capabilities

- `generator-cli`: Loads project configuration, resolves a generator, and collects generator inputs consistently from CLI flags or Clack prompts.
- `template-generation`: Expands generator template trees, renders Eta content, stages output safely, and commits or previews the resulting files.
- `module-source-updates`: Applies conservative AST-backed import and export updates to supported TypeScript and JavaScript source files.

### Modified Capabilities

- None.

## Impact

- Affected code: public generator/configuration API, CLI entry point, template/action runtime, filesystem utilities, and project packaging.
- Dependencies: `@clack/prompts`, `c12`, `change-case`, `eta`, `hookable`, `writepool`, and a TypeScript/JavaScript AST parser.
- Removes the prototype's runtime reliance on Commander, `prompts`, custom runtime config loading, and the prior snippet registry execution path.
