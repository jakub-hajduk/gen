# Proposal

## Why

Generators must currently be declared inline in `snipkit.config.*`, which forces
every generator into one file and makes shared or plugin-style modules awkward.
The project is pre-release, so the configuration shape can be replaced outright
rather than extended.

## What Changes

- **BREAKING**: `defineConfig` takes `generators` as a flat array of glob
  patterns (for example `['./generators/**/*.generator.ts', './generators/all.ts']`)
  instead of an array of inline generator objects.
- The loader discovers modules by expanding each glob relative to the config
  directory, imports them (TypeScript included), and resolves them into the
  runtime's generator list.
- Nested module exports are flattened automatically: a default or named export
  may be a generator, an array of generators, nested arrays, or an object with a
  `generators` array (plugin convention).
- Generator detection uses an internal brand applied by `defineGenerator`, so
  non-generator exports and files that export no generators are ignored.
- Duplicate generators are removed by object identity. Two distinct generators
  sharing a `name` fail the run and report the files that supplied them.
- **BREAKING**: `addTemplates` source directory (`from`) resolves relative to the
  directory of the module that defined the generator, so a module can carry its
  own templates. Write paths (`basePath`, `to`, `file`, template output) stay
  anchored to the config directory.
- Generator command names are unchanged: they still come from the generator's
  `name`, and file names never influence the CLI command.

## Capabilities

### New Capabilities

<!-- None -->

### Modified Capabilities

- `generator-cli`: generator declaration becomes a list of glob patterns; the
  loader discovers, imports, flattens, and deduplicates generator modules; the
  selection and flag contracts are unchanged.
- `template-generation`: the `addTemplates` source directory resolves relative to
  the directory of the module that defined the generator; output paths remain
  anchored to the generator base path.

## Impact

- Config API: `SnipkitConfig.generators` type changes from `Generator[]` to
  `string[]`; inline `defineGenerator` in the config file is removed.
- Loader: `src/config/load-config.ts` gains glob expansion, module import, and
  flatten/dedupe; a new discovery module holds this logic.
- Runtime: `resolveGenerator`, `RunContext`, `runGenerator`, and the
  `addTemplates` handler receive the defining module directory.
- Dependencies: add `tinyglobby` (glob) and `jiti` (TypeScript import).
- Documentation and tests for configuration shape, discovery, and template
  anchoring are updated.
