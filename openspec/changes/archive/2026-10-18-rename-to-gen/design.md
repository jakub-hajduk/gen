# Design

## Context

The package is at `0.0.0` and was never published, so there is no external consumer to migrate. See proposal.md - Why.

Unlike the earlier `snipkit -> snipo` rename, this rename is **not uniform**. Some occurrences become the scoped `@trut/gen`, others become the bare `gen`. That split is the core of the design, and it is what makes a single find-and-replace unsafe.

The old name lives on four surfaces that change for different reasons:

- **Package identity** - `package.json` `name` (scoped), `bin` (bare), `repository.url`.
- **Configuration convention** - `CONFIG_BASENAME` and the c12 `name` option in `src/config/load-config.ts` (bare).
- **CLI self-identity** - the help and usage text, the error strings in `src/runtime/resolve-generator.ts` (bare), and the `pkg.name ===` self-version check in `src/cli/run.ts` (scoped).
- **Public API identifiers and documentation** - `SnipoConfig` / `SnipoActions` / `loadSnipoConfig`, the brand symbol, module specifiers, augmentation targets, fixtures, and temp-directory prefixes.

## Goals / Non-Goals

**Goals:**

- One coherent identity: scoped `@trut/gen` for the package surface, bare `gen` for the CLI and configuration, `Gen` for exported identifiers.
- Every occurrence of the old name changes consistently, with the scoped and bare forms applied to the right places.
- The build, tests, and type-tests pass after the rename.

**Non-Goals:**

- The local working-directory name and the GitHub repository rename. These are host and GitHub-side actions.
- Rewriting archived OpenSpec changes or `CHANGELOG.md` links.
- Hand-editing `dist/` or `.idea/`.
- Centralizing the identity constants into a module. Deferred deliberately; this change stays a pure rename.

## Decisions

**Scoped for the package, bare for the CLI and configuration.** The mapping is:

| From                            | To                                   | Where                                          |
| ------------------------------- | ------------------------------------ | ---------------------------------------------- |
| `snipo` (package name)          | `@trut/gen`                          | `package.json` name                            |
| `snipo` (specifier)             | `@trut/gen`                          | imports, `declare module`, version check       |
| `snipo/runtime`, `snipo/cli`    | `@trut/gen/runtime`, `@trut/gen/cli` | subpath imports                                |
| `snipo` (command)               | `gen`                                | `bin` key, help, usage, error text, c12 `name` |
| `snipo.config`                  | `gen.config`                         | `CONFIG_BASENAME`                              |
| `SnipoConfig`                   | `GenConfig`                          | exported type                                  |
| `SnipoActions`                  | `GenActions`                         | exported type                                  |
| `loadSnipoConfig`               | `loadGenConfig`                      | exported function                              |
| `Symbol.for('snipo.generator')` | `Symbol.for('@trut/gen.generator')`  | generator brand                                |

Alternatives considered: a single uniform `snipo -> gen` sweep, rejected because it produces unresolvable imports (`gen`, `gen/runtime`) and an invalid `@trut/gen` binary name; and a uniform `snipo -> @trut/gen` sweep, rejected because the CLI would be invoked as `@trut/gen` and the config basename would become `@trut/gen.config`.

**`Gen*` symbol prefix.** The exported types and the loader take the `Gen` prefix to match the bare name. This sits close to the existing `Generator`, `defineGenerator`, and `generators` identifiers, but there is no compile-time collision and the package name makes `Gen` the natural choice. The alternative, a `Trut` prefix, was set aside as less recognizable.

**Namespaced brand key.** `Symbol.for` uses Node's global registry, so a key as generic as `gen.generator` risks colliding with another library that brands objects the same way, which could make a foreign object pass as a generator. The brand becomes `Symbol.for('@trut/gen.generator')` to keep it unique.

**`gen.config.*` basename.** The bare basename is generic, but discovery is bounded by the project boundary (workspace root or nearest `package.json`), so it cannot match files outside the project. Accepted for consistency with the bare command name.

**Regenerate `dist/`.** Run `pnpm build`; do not hand-edit generated output.

## Risks / Trade-offs

- **Scoped/bare mix-up** - a careless replacement turns imports into `gen` or the binary into `@trut/gen` -> update each occurrence by context and let `tsc`, the build, and the tests catch an unresolved specifier or an unusable bin.
- **Missed occurrence** -> verify with a case-insensitive search over the product surfaces and require zero matches.
- **Self-version check drifts** - `src/cli/run.ts` matches the package's own `name` to read its version; if the literal is not updated to `@trut/gen`, `--version` silently falls back to `0.0.0` -> covered by the rename task and the `--version` check.
- **Brand-string drift** -> change the brand in one place; the existing discovery tests catch a mismatch.
- **Config-fixture drift** - tests that write `snipo.config.ts` must write `gen.config.ts`, or discovery fixtures stop matching -> update fixtures in the same pass as `CONFIG_BASENAME`.
- **README-driven e2e** - `test/cli/e2e-component.test.ts` extracts examples from `README.md` and rewrites the import specifier, so `README.md` must be updated in the same pass or those tests fail.
- **Generic basename** (`gen.config.*`) matching an unrelated file -> bounded by the project boundary; accepted as a trade-off.

## Migration Plan

No migration is required: the package was never published, so there are no existing installs, configs, or consumers. Rollback is a single revert of the rename commit; the change is mechanical and self-contained.

## Open Questions

None that affect the specs, approach, or task breakdown. The GitHub repository rename is a manual follow-up and does not change this plan.
