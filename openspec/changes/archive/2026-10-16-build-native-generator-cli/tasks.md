# Tasks

## 1. Package and public declarations

- [x] 1.1 Replace prototype runtime dependencies with the ESM runtime dependencies for Clack, c12, change-case, Eta, Hookable, Writepool, and TypeScript AST processing; configure package exports and the executable bin, then verify `pnpm install` and `pnpm run build` succeed.
- [x] 1.2 Define and export the typed `defineConfig`, `defineGenerator`, built-in prompt constructors, and action constructors; require a static `basePath`, then verify TypeScript fixtures reject a generator without it.
- [x] 1.3 Add the internal typed lifecycle hook contract and run context with one Writepool per invocation; verify a failing lifecycle handler prevents a staged write from reaching disk.

## 2. Configuration and generator CLI

- [x] 2.1 Implement project-boundary detection and nearest `snipkit.config.*` discovery through c12, then verify root inheritance, package override, and missing-config errors with filesystem fixtures.
- [x] 2.2 Implement generator resolution, TTY-aware generator selection, and non-interactive generator-list errors, then verify both paths with CLI integration tests.
- [x] 2.3 Implement the shared prompt resolver that maps built-in prompt definitions to CLI flags and Clack interactions, then verify CLI precedence, default confirmation in a TTY, validation, and missing non-interactive arguments.

## 3. Template generation and staged writes

- [x] 3.1 Implement standard Eta rendering for action configuration and `.eta` content using the `it.answers` and `it.format` context, then verify a fixture renders both an input and a change-case formatter.
- [x] 3.2 Implement recursive `addTemplates` traversal, final `.eta` extension removal, and `{key}` / `{formatter:key}` filesystem-name expansion, then verify nested directory and formatted filename fixtures.
- [x] 3.3 Enforce normalized `basePath` containment and implement `--dry-run`, default collision failures, and global `--force`, then verify each behavior leaves or changes fixture files as specified.
- [x] 3.4 Document the generator configuration, prompt/CLI mapping, Eta context, filename placeholders, and write-control flags in the project README; verify every documented example runs against a fixture.

## 4. Module source updates

- [x] 4.1 Implement AST parsing and staged reads for `.ts`, `.tsx`, `.js`, and `.jsx` using targeted source edits, then verify unsupported extensions fail without modifying a fixture.
- [x] 4.2 Implement named import merging and member sorting without reordering declarations or side-effect imports, then verify updates against TypeScript and JSX fixtures containing side-effect imports.
- [x] 4.3 Implement named export merging and member sorting while preserving export declaration order, then verify idempotence by running the same export action twice.
- [x] 4.4 Ensure source-update parse or shape failures abort the whole staged run, then verify generated files are not committed when a later update action fails.

## 5. Integration verification

- [x] 5.1 Add an end-to-end fixture generator that creates a component tree and updates its barrel export from fully supplied CLI flags, then verify the command runs without interactive input and produces the expected tree.
- [x] 5.2 Run formatting, linting, type checking, unit tests, CLI integration tests, and a production build; verify all commands pass before review.

## Workflow follow-up

- Archive the change after implementation and review are complete.
