# Spec Delta

## Purpose

Lets another library or tool embed Snipkit's generator engine — loading
configuration, resolving prompts and generators, and running generators — through
a typed public API split by dependency cost, instead of shelling out to the CLI.

## ADDED Requirements

### Requirement: Declarative root entry carries no runtime dependencies

The package root SHALL export the declaration helpers and the public types
without importing runtime engines, so a project that only declares generators
loads no interactive-prompt, template, or source-editing dependencies.

#### Scenario: Declaring a generator loads no runtime engine

- **WHEN** a module imports the declaration helpers from the package root
- **THEN** no interactive-prompt, configuration-loader, template, or
  source-editing dependency is evaluated

#### Scenario: Public types resolve from the root

- **WHEN** a consumer imports a public type such as an action, prompt adapter,
  run context, hook map, or run result
- **THEN** the type resolves from the package root

### Requirement: Runtime entry exposes execution without the interactive CLI

The package SHALL provide a runtime entry point that exposes generator execution
and does not import the interactive-prompt adapter used by the CLI entry.

#### Scenario: Non-interactive consumer omits the prompt library

- **WHEN** a consumer imports the runtime entry to run a generator with supplied
  answers
- **THEN** the interactive-prompt adapter's library is not evaluated

#### Scenario: CLI entry retains interactive behavior

- **WHEN** a consumer imports the CLI entry
- **THEN** interactive selection and prompting remain available

### Requirement: Generators run programmatically without a configuration file

The runtime SHALL run a caller-provided generator given an explicit answers map,
a configuration directory, and a module directory, staging and committing output
without requiring a `snipkit.config.*` file to exist.

#### Scenario: Code-defined generator runs without configuration

- **WHEN** a caller passes a generator, an answers map, a configuration
  directory, and a module directory to the runtime
- **THEN** the generator's actions run and its output is written below the base
  path resolved from the configuration directory

#### Scenario: Dry run reports without writing

- **WHEN** the caller requests a dry run
- **THEN** the runtime returns the staged file list and writes nothing

### Requirement: Configuration loading and generator resolution are exposed

The runtime SHALL expose loading the nearest configuration, discovering its
generator modules, and resolving one generator by name, and SHALL raise
actionable errors for a missing configuration, an empty generator set, and an
unknown name.

#### Scenario: Resolve a generator by name

- **WHEN** a caller loads a configuration with several generators and requests
  one by name
- **THEN** the matching generator is returned with the directory of its defining
  module

#### Scenario: Unknown name lists alternatives

- **WHEN** a caller requests a generator name that does not exist
- **THEN** the error names the requested name and the available generator names

### Requirement: Prompt answers resolve through a caller-supplied adapter

The runtime SHALL resolve prompt answers using a caller-supplied adapter,
applying each prompt's validation and formatting, preferring a supplied value
over an adapter interaction, and falling back to a prompt default when
non-interactive.

#### Scenario: Supplied value overrides the adapter

- **WHEN** a value is supplied for a prompt and an adapter is present
- **THEN** the adapter is not invoked for that prompt and the supplied value is
  validated and used

#### Scenario: Missing non-interactive value fails

- **WHEN** a required prompt has no supplied value, no default, and the adapter
  is non-interactive
- **THEN** resolution fails with an error naming the missing value

### Requirement: Lifecycle hooks are publicly observable

The runtime SHALL expose a hook registry and its lifecycle hook names and
payloads, and a hook that throws SHALL abort the run before any file is
committed.

#### Scenario: Configuration and action hooks fire

- **WHEN** a caller registers hooks for configuration resolution and around each
  action and then runs a generator
- **THEN** the hooks are invoked in lifecycle order with the documented payloads

#### Scenario: Hook failure prevents writes

- **WHEN** a registered hook throws during a run
- **THEN** the run fails and no staged file is written

### Requirement: Reusable primitives support custom generator output

The runtime SHALL expose staging and rendering primitives — staging generated
and in-place files, rendering configuration strings and template content, name
expansion, and base-path containment — so a caller can build actions that
contribute output under the base path.

#### Scenario: Staged rendered file is committed

- **WHEN** a caller renders content and stages it at a path within the base path
- **THEN** the file is written on commit

#### Scenario: Escaping path is rejected

- **WHEN** a caller stages or resolves an output path that escapes the base path
- **THEN** the call fails and nothing is written

### Requirement: Built-in action handlers are reusable

The runtime SHALL expose the built-in action handlers so a caller can invoke or
compose the behavior of the built-in actions.

#### Scenario: Built-in handler stages its output

- **WHEN** a caller invokes the built-in handler for a template, import, or
  export action with a run context
- **THEN** the handler stages the corresponding output in that context
