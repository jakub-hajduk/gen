# Tasks

## 1. Dependencies and configuration shape

- [x] 1.1 Add `tinyglobby` and `jiti` to `dependencies` in `package.json` and verify `pnpm install` and `pnpm typecheck` succeed
- [x] 1.2 Change `SnipkitConfig.generators` in `src/config/define-config.ts` to `string[]` and verify `pnpm typecheck` and the type-tests pass
- [x] 1.3 Stamp generators with the `Symbol.for('snipkit.generator')` brand in `src/config/define-generator.ts` and add a unit test asserting a branded generator is recognized and a plain object is not

## 2. Discovery pipeline

- [x] 2.1 Add a discovery module that expands each glob with `tinyglobby` relative to `configDir`, imports matches with a single shared `jiti` instance, and returns matched file paths in deterministic order (glob order, then path-sorted), verified by a unit test with nested directories
- [x] 2.2 Implement recursive flattening of default exports, named exports, arrays, and `{ generators: [...] }`, collecting only branded generators and ignoring files that export none, verified by tests for each export shape
- [x] 2.3 Implement deduplication by object identity and a name-conflict error that lists the defining files, verified by tests for same-object, re-export, and same-name-different-file cases
- [x] 2.4 Update `loadSnipkitConfig` to return resolved `{ generator, moduleDir }[]` alongside the raw `config` and reject non-string `generators` entries with an actionable error, verified by updating `test/config/discovery.test.ts`
- [x] 2.5 Document the new `generators` glob shape in `docs/getting-started.md` and `docs/cli-generator.md` and verify the documented example config matches the implemented shape

## 3. Runtime wiring and selection

- [x] 3.1 Change `resolveGenerator` to consume the resolved `generators` list and update `runCli` to pass it, verified by updating `test/cli/generator-selection.test.ts`
- [x] 3.2 Verify that a discovered generator still runs as `snipkit <name>` and that file names do not affect command names, via an end-to-end test using a glob-based config

## 4. Template source anchoring

- [x] 4.1 Carry `moduleDir` from the resolved generator through `runGenerator` into `RunContext` and resolve `addTemplates.from` relative to it in `src/runtime/handlers/add-templates.ts`, verified by a unit test where a generator module in a subdirectory reads its own templates
- [x] 4.2 Add a test asserting `basePath` and all output paths remain anchored to the config directory when `from` resolves from elsewhere, and document the read/write anchoring split in `docs/cli-generator.md`

## 5. Integration

- [x] 5.1 Add an end-to-end fixture with a glob config, a plugin module exporting several generators, and module-local templates, and verify a full run writes the expected files
- [x] 5.2 Update `README.md` and the remaining docs for the glob configuration and flattened modules, and verify `pnpm check` passes

## Workflow follow-up

- Archive the change after review, per the project's OpenSpec workflow.
