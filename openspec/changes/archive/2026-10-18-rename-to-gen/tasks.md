# Tasks

## 1. Package and CLI identity

- [x] 1.1 Rename the package in `package.json` (`name` -> `@trut/gen`, the `bin` key -> `gen`, `repository.url` -> `https://github.com/jakub-hajduk/gen`), then verify `pnpm build` succeeds and `package.json` maps the `gen` binary to `./dist/cli.mjs`.
- [x] 1.2 Change `CONFIG_BASENAME` in `src/config/load-config.ts` to `gen.config`, the c12 `name` option to `gen`, and the `snipo` wording in its validation errors to `gen`, then verify the discovery tests pass.
- [x] 1.3 Update `src/runtime/resolve-generator.ts` (`snipo configuration`, `Run "snipo <generator>"`) and the `src/cli/run.ts` help and usage text to the bare `gen`, and change the self-version check to `pkg.name === '@trut/gen'`, then verify the generator-selection test passes and `node dist/cli.mjs --version` prints the package version (`0.0.0`).
- [x] 1.4 Rename the configuration fixtures written by the tests to `gen.config.ts` and the temporary-directory prefixes to `gen-` (`test/config/discovery.test.ts`, `test/config/discover-generators.test.ts`, `test/programmatic/pipeline.test.ts`, `test/programmatic/run.test.ts`, `test/cli/e2e-discovery.test.ts`, `test/cli/e2e-component.test.ts`, `test/cli/generator-selection.test.ts`, `test/helpers/fixtures.ts`, `test/runtime/commit.test.ts`), then run `pnpm test` to confirm discovery still finds the configuration.

## 2. Public API identifiers

- [x] 2.1 Rename `SnipoConfig` -> `GenConfig` (`src/config/define-config.ts`, `src/config/load-config.ts`, `src/runtime/hooks.ts`, `src/index.ts`) and `loadSnipoConfig` -> `loadGenConfig` (`src/config/load-config.ts`, `src/runtime.ts`, `src/cli/run.ts`), then verify `pnpm check` reports no type errors.
- [x] 2.2 Rename `SnipoActions` -> `GenActions` (`src/actions/types.ts`, `src/actions/index.ts`, `src/index.ts`, `type-tests/action-extension.ts`) and point the module-augmentation example at `declare module '@trut/gen'`, then verify the type-tests in `type-tests/` compile via `pnpm check`.
- [x] 2.3 Change the generator brand in `src/config/define-generator.ts` to `Symbol.for('@trut/gen.generator')`, then verify the discovery tests that recognize a branded generator pass.
- [x] 2.4 Update the remaining test references (`loadSnipoConfig` imports in `test/config/discovery.test.ts` and `test/programmatic/pipeline.test.ts`, the `SnipoActions` augmentation in `test/runtime/action-handlers.test.ts`, and the `from 'snipo'` rewrite in `test/cli/e2e-component.test.ts`) to the new names, then run `pnpm test`.

## 3. Documentation

- [x] 3.1 Update `README.md` to the new identity: install command `@trut/gen`, `gen.config.ts`, `@trut/gen` / `@trut/gen/runtime` imports, `declare module '@trut/gen'`, and `pnpm gen` invocations.
- [x] 3.2 Update the six files under `docs/` (`README.md`, `getting-started.md`, `architecture.md`, `generators-and-actions.md`, `programmatic-api.md`, `for-ai-agents.md`) to the new identity in prose, code samples, module specifiers, and the config filename.
- [x] 3.3 Verify the docs contain no remaining old-name references by searching `README.md` and `docs/` case-insensitively for `snipo` and confirming zero matches.

## 4. Integration verification

- [x] 4.1 Run `pnpm check` (oxlint, oxfmt, `tsc --noEmit`) and `pnpm test`, then run `pnpm build` and confirm it emits a `dist/cli.mjs` reachable through the renamed `gen` bin and that `node dist/cli.mjs --version` prints the version. `tsc` and `oxlint` pass, `pnpm test` is 69/69, and the build emits the bin; `oxfmt` failures in `CHANGELOG.md`, `package.json` (devDependency order) and `release-it.ts` are pre-existing at HEAD (from the "chore: change release tool" commit) and left out of scope.
- [x] 4.2 Search the working tree case-insensitively for `snipo`, excluding the deliberately untouched paths (`CHANGELOG.md`, `openspec/` records — archived changes, this change's own artifacts, and the live specs that archive syncs — `.git/`, `node_modules/`, `dist/`, `.idea/`), and confirm zero matches remain in product code and docs.

## Workflow follow-up

- Rename the GitHub repository to `jakub-hajduk/gen` and update the git remote, then confirm the `repository.url` in `package.json` resolves.
- Rename the local working directory `snipkit` -> `gen`.
- When archiving: the `programmatic-api` main-spec Purpose still names the old tool; update it there directly (an existing capability's Purpose is edited in the main spec, not via the delta).
- Archive this change after review; archiving copies the spec deltas into `openspec/specs/generator-cli` and `openspec/specs/programmatic-api`.
