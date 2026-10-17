# Design

## Context

See `proposal.md` for motivation. The relevant current state:

- `dist/index.mjs` is 1398 bytes and has zero imports; the built package keeps
  dependencies external, so the root entry is pure declarative DSL.
- `dist/cli.mjs` imports `@clack/prompts`, `typescript`, `eta`, `c12`, `jiti`,
  `tinyglobby`, `writepool`, and `hookable` at the top level.
- The engine is already decomposed (`src/config/*`, `src/runtime/*`), and
  `runGenerator` already accepts `configDir` and `moduleDir` explicitly, so it can
  run a code-defined generator with no `snipkit.config.*` present.
- `Action` is a closed union of three types (`src/actions/types.ts:23`), and
  `ActionHandlerRegistry` is a mapped type over `Action['type']`
  (`src/runtime/actions.ts:10`); `runActions` throws `Unsupported action type`
  for an unknown type.
- `updateImports`/`updateExports` already name the **action constructors** exported
  from the root; the AST editors in `src/runtime/source-update.ts` share those names.

## Goals / Non-Goals

**Goals:**

- Publish the engine as a typed programmatic API without forcing runtime
  dependencies on declaration-only consumers.
- Let a consumer add custom action types and handlers without forking Snipkit.
- Keep `snipkit/cli` behavior and the existing declarative root exports unchanged.

**Non-Goals:**

- Branding options on `runCli` (name/version/help). Wrappers build their own
  pipeline from the runtime entry; `runCli` stays Snipkit's own binary.
- A public plugin-registration or hook-ordering API beyond the existing lifecycle
  hooks.
- Any change to CLI behavior, the built-in actions, or their resulting output.
- New built-in actions.

## Decisions

### Entry-point tiering: types at the root, functions at `snipkit/runtime`, Clack at `snipkit/cli`

The root stays import-free (DSL plus all public types, including `Action`,
`SnipkitActions`, `PromptAdapter`, `RunContext`, `RunHooks`, `RunResult`). A new
`snipkit/runtime` entry exposes the Clack-free functions. `snipkit/cli` keeps
`runCli` and the Clack adapter. This keeps the module graph a declaration-only
author pays at zero, while a wrapper imports one runtime entry.

- _Alternatives considered_: (A) re-export everything from the root — simplest but
  every `import 'snipkit'` then evaluates Clack, TypeScript, c12, jiti, and
  tinyglobby; (C) a single `snipkit/programmatic` entry that also contains
  `runCli` — merges the two consumers and re-couples Clack to the runtime.

### Action extensibility via module augmentation

`src/actions/types.ts` declares an empty, mergeable `interface SnipkitActions {}`
and widens the union:

```ts
export type Action =
  | AddTemplatesAction
  | UpdateImportsAction
  | UpdateExportsAction
  | SnipkitActions[keyof SnipkitActions]; // = never when not augmented
```

`ActionHandlerRegistry` and `runActions` need no structural change: the mapped
type and `Extract<Action, { type }>` pick up the augmented members. A consumer
writes `declare module 'snipkit' { interface SnipkitActions { ... } }`.

- _Alternatives considered_: generic `Action<TCustom>` threaded through `Generator`,
  `defineGenerator`, `ActionHandlerRegistry`, `runActions`, and `runGenerator`
  (cleaner isolation, larger type churn and harder inference); a string-keyed
  registry (`Record<string, handler>`, loses discriminated-union narrowing).
- _Chosen_ for the selected trade-off: least churn, one consumer, acceptable that
  augmentation is global per program. Consumers must namespace action keys that
  could collide (for example `acme/manifest`).

### Handler registry is an overlay with built-ins merged in

`runGenerator` accepts `handlers?: Partial<ActionHandlerRegistry>` and composes
`{ ...createActionHandlers(), ...options.handlers }`. `createActionHandlers` is
public and typed as `Partial<ActionHandlerRegistry>` so a caller can also build the
registry directly.

- _Alternative_: require a full registry, forcing every caller to spread the
  built-ins; rejected as error-prone (a caller that forgets loses built-in actions
  and hits `Unsupported action type`).

### AST editors are exposed under distinct names

`snipkit/runtime` exposes the AST editors as `editImports`/`editExports` (with the
`ImportUpdate`/`ExportUpdate` types), while the action constructors stay at the
root. `snipkit/runtime` does **not** re-export the action constructors, so a name
never means two different things across entries.

- _Alternatives considered_: a `snipkit/runtime/source` subpath (extra build entry,
  clearer namespace); keeping the raw names in runtime (collides with root
  constructors). The alias keeps the entry count low; a subpath can be added later
  without breaking the alias.

### Third-party types are re-exported, not narrowed

`RunContext.files` stays `Writepool` and `RunHookable` stays `Hookable<RunHooks>`,
and the root type surface re-exports the `Writepool` and `Hookable` types so
consumers can annotate without importing the transitive packages directly.

- _Alternative_: narrow `RunContext` to a structural file-pool interface;
  rejected because it changes internal call sites and hides capability the custom
  handlers rely on.

### Augmentation target and verification

`SnipkitActions` is declared once in `src/actions/types.ts` and re-exported from the
root; the runtime imports `Action` from that same module. Consumers augment
`'snipkit'`. A type-test asserts the augmentation reaches `Action` as seen through
`snipkit/runtime`.

## Risks / Trade-offs

- **Re-exported internals become a public contract** → Treat `snipkit/runtime` and
  the augmented `Action` as versioned public API; document them as such and cover
  them with type-tests.
- **Module augmentation is global per program; two wrappers can collide on a key** →
  Require namespaced action keys; collisions are a compile-time error the wrapper
  author resolves.
- **Root could accidentally gain a dependency import over time** → Add a test/check
  that the built root entry evaluates with no runtime dependency, guarding the
  tiering.
- **Frozen handler and `RunContext` signatures raise the cost of future internal
  refactors** → Accepted: the consumer is the package author, and the surface is the
  intended extension seam.
- **`snipkit/runtime` pulls TypeScript and the resolvers** → Accepted as the cost of
  the full surface; the root stays lean so declaration-only authors are unaffected.

## Migration Plan

- Additive and non-breaking at the package level: new exports and new subpath only;
  the root's existing exports are unchanged. Release as a minor version.
- Update `package.json` `exports` and `tsdown.config.ts` entry list for the new
  entry; internal `Action`/registry typing changes do not alter published behavior.
- Add type-tests (augmentation through `snipkit/runtime`, code-defined run types),
  runtime tests (overlay handlers, code-defined run without config, unhandled
  action atomic failure), and a programmatic-usage section in the README.
- Rollback is reverting the additive entries; no data or runtime migration.

## Open Questions

None blocking. The AST-editor alias name (`editImports`/`editExports`) could later
be complemented by a `snipkit/runtime/source` subpath without breaking the alias.
