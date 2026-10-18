# Spec Delta

## MODIFIED Requirements

### Requirement: Generators run programmatically without a configuration file

The runtime SHALL run a caller-provided generator given an explicit answers map,
a configuration directory, and a module directory, staging and committing output
without requiring a `gen.config.*` file to exist.

#### Scenario: Code-defined generator runs without configuration

- **WHEN** a caller passes a generator, an answers map, a configuration
  directory, and a module directory to the runtime
- **THEN** the generator's actions run and its output is written below the base
  path resolved from the configuration directory

#### Scenario: Dry run reports without writing

- **WHEN** the caller requests a dry run
- **THEN** the runtime returns the staged file list and writes nothing

### Requirement: Package and export identity

The package SHALL be published and imported as `@trut/gen`, SHALL expose the `@trut/gen/runtime` and `@trut/gen/cli` entry points, and SHALL export its public identifiers under the `Gen` prefix, including `GenConfig`, `GenActions`, and `loadGenConfig`.

#### Scenario: Package root import

- **WHEN** a consumer imports the declaration helpers or public types to declare or augment a generator
- **THEN** the import resolves from the `@trut/gen` package root

#### Scenario: Runtime and CLI entry imports

- **WHEN** a consumer imports the runtime entry to run a generator or the CLI entry to reach interactive behavior
- **THEN** the import resolves from `@trut/gen/runtime` or `@trut/gen/cli` respectively
