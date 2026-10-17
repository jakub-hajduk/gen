# Spec Delta

## MODIFIED Requirements

### Requirement: Generators run programmatically without a configuration file

The runtime SHALL run a caller-provided generator given an explicit answers map,
a configuration directory, and a module directory, staging and committing output
without requiring a `snipo.config.*` file to exist.

#### Scenario: Code-defined generator runs without configuration

- **WHEN** a caller passes a generator, an answers map, a configuration
  directory, and a module directory to the runtime
- **THEN** the generator's actions run and its output is written below the base
  path resolved from the configuration directory

#### Scenario: Dry run reports without writing

- **WHEN** the caller requests a dry run
- **THEN** the runtime returns the staged file list and writes nothing

## ADDED Requirements

### Requirement: Package and export identity

The package SHALL be published and imported as `snipo`, SHALL expose the `snipo/runtime` and `snipo/cli` entry points, and SHALL export its public identifiers under the `Snipo` prefix, including `SnipoConfig`, `SnipoActions`, and `loadSnipoConfig`.

#### Scenario: Package root import

- **WHEN** a consumer imports the declaration helpers or public types to declare or augment a generator
- **THEN** the import resolves from the `snipo` package root

#### Scenario: Runtime and CLI entry imports

- **WHEN** a consumer imports the runtime entry to run a generator or the CLI entry to reach interactive behavior
- **THEN** the import resolves from `snipo/runtime` or `snipo/cli` respectively
