# Tasks

## 1. Package and CLI identity

- [x] 1.1 Rename the package in `package.json` (`name` -> `snipo`, the `bin` key -> `snipo`, `repository.url` -> `.../snipo`), then verify `pnpm build` succeeds and `package.json` maps the `snipo` binary to `./dist/cli.mjs`.
- [x] 1.2 Change `CONFIG_BASENAME` in `src/config/load-config.ts` to `snipo.config` and update the `snipkit` wording in its validation errors, then verify the discovery tests pass.
- [x] 1.3 Update the CLI guidance and error strings in `src/runtime/resolve-generator.ts` (`snipkit configuration`, `Run "snipkit <generator>"`) to `snipo`, then verify the corresponding run/e2e tests that assert on those messages pass.
- [x] 1.4 Rename the configuration fixtures written by the tests to `snipo.config.ts` (`test/config/discovery.test.ts`, `test/programmatic/pipeline.test.ts`, `test/programmatic/run.test.ts`, `test/cli/e2e-discovery.test.ts`, `test/cli/e2e-component.test.ts`, `test/cli/generator-selection.test.ts`, `test/helpers/fixtures.ts`) and run `pnpm test` to confirm discovery still finds the configuration.

## 2. Public API identifiers

- [x] 2.1 Rename `SnipkitConfig` -> `SnipoConfig` (`src/config/define-config.ts`, `src/config/load-config.ts`, `src/runtime/hooks.ts`, `src/index.ts`) and `loadSnipkitConfig` -> `loadSnipoConfig` (`src/config/load-config.ts`, `src/runtime.ts`, `src/cli/run.ts`), then verify `pnpm check` reports no type errors.
- [x] 2.2 Rename `SnipkitActions` -> `SnipoActions` (`src/actions/types.ts`, `src/actions/index.ts`, `src/index.ts`, `type-tests/action-extension.ts`) and point the module-augmentation example at `declare module 'snipo'`, then verify the type-tests in `type-tests/` compile via `pnpm check`.
- [x] 2.3 Change the generator brand in `src/config/define-generator.ts` to `Symbol.for('snipo.generator')`, then verify the discovery tests that recognize a branded generator pass.
- [x] 2.4 Update the remaining test references (`loadSnipkitConfig` imports in `test/config/discovery.test.ts` and `test/programmatic/pipeline.test.ts`, the `SnipkitActions` augmentation in `test/runtime/action-handlers.test.ts`, the `from 'snipkit'` rewrite in `test/cli/e2e-component.test.ts`) and the temporary-directory prefixes (`snipkit-` -> `snipo-`) in `test/helpers/fixtures.ts`, `test/runtime/commit.test.ts`, and `test/config/discover-generators.test.ts`, then run `pnpm test`.

## 3. Documentation

- [x] 3.1 Update `README.md` to the `snipo` name: title, install command, `snipo.config.ts`, `snipo` / `snipo/runtime` imports, `declare module 'snipo'`, and `pnpm snipo` invocations.
- [x] 3.2 Update the six files under `docs/` (`README.md`, `getting-started.md`, `architecture.md`, `generators-and-actions.md`, `programmatic-api.md`, `for-ai-agents.md`) to the `snipo` name in prose, code samples, module specifiers, and the config filename.
- [x] 3.3 Verify the docs contain no remaining old-name references by searching `README.md` and `docs/` case-insensitively for `snipkit` and confirming zero matches.

## 4. Integration verification

- [x] 4.1 Run `pnpm check` (oxlint, oxfmt, `tsc --noEmit`) and `pnpm test`, then run `pnpm build` and confirm it emits a `dist/cli.mjs` reachable through the renamed `snipo` bin. oxlint and `tsc` pass, `pnpm test` is 69/69, and the build emits the bin; the `CHANGELOG.md` oxfmt failure is pre-existing at HEAD and left out of scope.
- [x] 4.2 Search the working tree case-insensitively for `snipkit`, excluding the deliberately untouched paths (`CHANGELOG.md`, `openspec/` records — archived changes, this change's own artifacts, and the live specs that archive syncs — `.git/`, `node_modules/`, `dist/`, `.idea/`), and confirm zero matches remain in product code and docs.

## Workflow follow-up

- Rename the GitHub repository `jakub-hajduk/snipkit` -> `snipo` and update the git remote, then confirm the `repository.url` in `package.json` resolves.
- Rename the local working directory `snipkit` -> `snipo`.
- Archive this change after review; archiving copies the spec deltas into `openspec/specs/generator-cli` and `openspec/specs/programmatic-api`.
