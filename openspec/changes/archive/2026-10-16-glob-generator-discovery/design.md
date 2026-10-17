# Design

## Context

Today `SnipkitConfig.generators` is a `Generator[]` built inline with
`defineGenerator`, and `loadSnipkitConfig` validates only that it is an array
(`src/config/load-config.ts:135`). `resolveGenerator` then reads
`config.generators` directly (`src/runtime/resolve-generator.ts:17`). See
proposal.md for motivation.

Two constraints shape the approach:

- The config file is loaded by `c12`, which already uses `jiti` to import
  TypeScript (`node_modules/c12/dist/index.mjs:8`). Discovery will import modules
  the same way.
- In the runtime, `context.configDir` is consumed in exactly one place, the
  `addTemplates` source resolution (`src/runtime/handlers/add-templates.ts:21`).
  Every other path is anchored to `basePath`. That makes read/write anchoring a
  localized change.

## Goals / Non-Goals

**Goals:**

- Replace inline generator declaration with a flat list of glob patterns.
- Discover, import, flatten, and deduplicate generator modules into the existing
  `Generator[]` the runtime already consumes, so command resolution and flag
  parsing are untouched.
- Carry each generator's defining module directory so `addTemplates.from` can be
  module-local.

**Non-Goals:**

- No public plugin registration or hook API.
- No static analysis of re-exports to recover the true defining file.
- No extension allow-list on matched files; non-generator files are ignored.
- No backward compatibility or migration path (pre-release).

## Decisions

### Configuration shape: flat array of globs

`SnipkitConfig.generators` becomes `string[]`. Each entry is a glob resolved
relative to the config directory. Chosen over a `Generator[] | string` union or a
separate `generatorFiles` key because the project is pre-release and the request
is to remove the need for inline declaration, not to preserve it.

### Discovery pipeline

A new module runs the pipeline, keeping `load-config.ts` focused on locating and
loading the file:

```
[1] tinyglobby: expand each glob relative to configDir
[2] jiti: import each matched module (TypeScript included)
[3] flatten: default / named / arrays / { generators: [...] }
[4] detect: generator brand symbol
[5] dedupe: object identity (silent) + name conflict (error)
```

- `tinyglobby` is chosen over `fast-glob` (lighter) and the experimental
  `fs.glob` (unstable, less ergonomic).
- `jiti` becomes a direct dependency; discovery reuses one instance so module
  identity is stable across imports.

### Flattening and detection

`defineGenerator` stamps each generator with a `Symbol.for('snipkit.generator')`
brand. Flattening descends default exports, named exports, nested arrays, and
objects with a `generators` array. Only branded objects are collected; anything
else is ignored. The brand is chosen over duck-typing (`name` + `basePath` +
`actions`) because it cannot misfire on configuration-shaped objects, and it is
invisible to users.

### Deduplication

- Same object reached through multiple globs, modules, or re-exports: removed
  silently. Module identity is preserved because `jiti` caches by resolved path.
- Two distinct generators declaring the same `name`: fail the run and report the
  defining files. This is a real mistake, not a duplicate.

### Loader output shape

`LoadedConfig` gains a resolved `generators: { generator, moduleDir }[]` and
keeps the raw `config` as loaded:

```
loadSnipkitConfig -> { config, generators, configPath, configDir, boundary }
resolveGenerator({ generators })
```

Chosen over mutating `config.generators` in place so the raw `config` stays
faithful to what the user wrote, the `config:resolve` hook can see the globs that
ran, and discovery is testable independently of `resolveGenerator`.

### Module directory anchoring for template sources

`basePath` and all write paths stay anchored to `configDir`. `addTemplates.from`
is the single read path and moves to the defining module's directory:

```
basePath = resolve(configDir, generator.basePath)   // write axis
from     = resolve(moduleDir, action.from)          // read axis
```

`moduleDir` travels with the resolved generator into `RunContext`. The public
`Generator` type is untouched; the directory lives in the discovery wrapper.

Because re-exports preserve object identity but not the true defining file, the
anchor is the directory of the module from which the generator was first
observed. Globs are processed in array order and matches are sorted by path, so
"first" is deterministic. This is correct for the natural pattern
(`**/*.generator.ts`, direct imports) and documented as "import a generator from
its own file".

### Deterministic ordering

Globs in array order, matched files sorted by path, exports in module order.
Generators with the same name are rejected, so ordering never silently decides
which definition wins.

## Risks / Trade-offs

- [Re-export shifts the `from` anchor to the barrel's directory] → deterministic
  first-observation rule; document that generators should be imported from their
  own file. Recovering the true defining file is a non-goal.
- [Broad globs match helper or declaration files that export no generator] →
  brand detection ignores them silently; a matched module contributes nothing.
- [Object-identity dedupe depends on a single shared `jiti` instance] → use one
  instance for the whole discovery pass.
- [Cold-start cost: every run globs and imports all modules] → acceptable for a
  pre-release tool; `-h`/`-v` short-circuit before config loading.
- [`tinyglobby` + `jiti` add weight] → both are small and `jiti` is already
  present transitively via `c12`.

## Migration Plan

None required. The configuration shape changes outright; existing inline
configurations fail validation. Documentation, tests, and the `generator-cli`
spec are updated in the same change.

## Open Questions

None blocking. Whether to later support an extension allow-list or a dedicated
plugin registration API can be decided without changing this design.
