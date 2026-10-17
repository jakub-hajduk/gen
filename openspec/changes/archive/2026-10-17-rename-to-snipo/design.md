# Design

## Context

The package is at version `0.0.1` and was never published under `snipkit`, so there is no external consumer to migrate. See proposal.md - Why for motivation.

The old name is spread across four distinct surfaces that change for different reasons:

- **Package identity** - `package.json` `name`, `bin`, and `repository.url`.
- **Configuration convention** - a single constant, `CONFIG_BASENAME = 'snipkit.config'` in `src/config/load-config.ts`, which drives discovery of the user's generator configuration file.
- **Public API identifiers** - types and functions exported from the package root and runtime entries (`SnipkitConfig`, `SnipkitActions`, `loadSnipkitConfig`) plus the generator brand `Symbol.for('snipkit.generator')`.
- **Documentation and tests** - prose, code samples, module specifiers, module-augmentation targets, fixture filenames, and temp-directory prefixes.

The published surface is split by entry point (`src/index.ts`, `src/runtime.ts`, `src/cli.ts`), and generated output lives in a git-ignored `dist/`.

## Goals / Non-Goals

**Goals:**

- One coherent name, `snipo`, everywhere a user or consumer can observe it.
- Every occurrence of the old name changes consistently, across all three casing forms.
- The build, tests, and type-tests pass after the rename.

**Non-Goals:**

- The local working-directory name and the GitHub repository rename. These are host and GitHub-side actions, not file edits.
- Rewriting archived OpenSpec changes or `CHANGELOG.md` commit links; they are historical records.
- Hand-editing `dist/` or `.idea/`; both are git-ignored and regenerated or IDE-managed.

## Decisions

**Case-aware mapping, not a single lowercase replace.** The old name appears as `snipkit` (package, filename, module specifier), `Snipkit` (prose), and `SnipkitConfig` / `SnipkitActions` (PascalCase identifiers). A lowercase-only sweep would silently leave every exported type and the `loadSnipkitConfig` function on the old prefix. The mapping is:

| From                              | To                              |
| --------------------------------- | ------------------------------- |
| `snipkit`                         | `snipo`                         |
| `Snipkit`                         | `Snipo`                         |
| `SnipkitConfig`                   | `SnipoConfig`                   |
| `SnipkitActions`                  | `SnipoActions`                  |
| `loadSnipkitConfig`               | `loadSnipoConfig`               |
| `Symbol.for('snipkit.generator')` | `Symbol.for('snipo.generator')` |

Alternatives considered: a single lowercase `sed`, rejected because it produces `snipoConfig`/`loadsnipoConfig`-style misses and inconsistent casing.

**Rename the configuration basename.** `snipo.config.*` replaces `snipkit.config.*`. This is a breaking change to the user-facing convention, accepted because nothing is published and no consumer depends on the old name. Keeping the old basename would leave two brands in the codebase indefinitely.

**Rename the public API identifiers.** The exported `Snip*` names and the brand symbol change together with the package name, so the module-augmentation contract (`declare module 'snipo'`) matches the published specifier. Leaving the identifiers on the old name would make `import type { SnipkitConfig } from 'snipo'` internally inconsistent.

**Keep the config basename as one source of truth.** `CONFIG_BASENAME` in `src/config/load-config.ts` already centralizes the discovery name. Only its value changes; discovery logic is untouched.

**Regenerate `dist/`.** Run `pnpm build`; do not hand-edit generated output.

## Risks / Trade-offs

- **Missed occurrence** (a lowercased reference survives) -> verify with a case-insensitive search that excludes the deliberately untouched `CHANGELOG.md`, `openspec/changes/archive/`, `.idea/`, and `dist/`, and require zero matches.
- **Brand-string drift** - the discovery check compares against `Symbol.for('snipkit.generator')`; if `define-generator.ts` and any consumer disagree, generators stop being recognized -> change it in one place and rely on the existing discovery tests to catch a mismatch.
- **Augmentation target mismatch** - type-tests and docs use `declare module 'snipkit'`; if the package `name` changes but the augmentation string does not (or vice versa), type-tests fail -> the type-tests are the guard.
- **Config-fixture drift** - tests that write `snipkit.config.ts` must write `snipo.config.ts`, or discovery fixtures silently stop matching -> update fixtures and test names in the same pass as `CONFIG_BASENAME`.
- **Stale git-ignored artifacts** (`dist/`, `.idea/snipkit.iml`) keep the old name locally -> regenerate `dist`; IDE renames its own files when the directory is renamed.

## Migration Plan

No migration is required: `0.0.1` was never published, so there are no existing installs, configs, or consumers. Rollback is a single revert of the rename commit; because the change is mechanical and self-contained, reverting restores the prior state with no partial-migration risk.

## Open Questions

None that affect the specs, approach, or task breakdown. The GitHub repository rename is deferred to a manual step and does not change this plan.
