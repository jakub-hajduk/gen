# Spec Delta

## Purpose

Provides a deterministic generator command line that works equally for interactive users and non-interactive automation.

## ADDED Requirements

### Requirement: Project configuration discovery

The system SHALL load the nearest `snipkit.config.*` found from the invocation directory up to and including the project boundary. The boundary SHALL be the workspace root for a monorepo, or the nearest ancestor with `package.json` for a non-workspace project. A missing configuration SHALL produce an actionable error without searching outside that boundary.

#### Scenario: Configuration inherited from a monorepo root

- **WHEN** the command runs in a workspace package with no nearer configuration
- **THEN** the system loads the configuration at the workspace root

#### Scenario: A package configuration takes precedence

- **WHEN** a workspace package and its workspace root both contain a configuration
- **THEN** the system loads the package configuration

### Requirement: Generator declaration has a static base path

Every generator SHALL declare a non-empty static `basePath`. The system SHALL resolve that path relative to the directory containing the loaded configuration and SHALL reject a generator that omits it.

#### Scenario: Generator output base is independent of invocation directory

- **WHEN** a generator with `basePath: "src/components"` runs from a project subdirectory
- **THEN** its base path resolves below the loaded configuration directory

### Requirement: Interactive generator selection

The system SHALL show an interactive generator selection when no generator name is supplied in an interactive terminal. In a non-interactive environment, it SHALL fail and list the available generator names instead of waiting for input.

#### Scenario: Interactive selection

- **WHEN** a user runs Snipkit without a generator name from a TTY
- **THEN** the user can select one declared generator through the terminal interface

#### Scenario: Non-interactive selection failure

- **WHEN** automation runs Snipkit without a generator name
- **THEN** the command exits with an error that identifies the available generators

### Requirement: Prompts and CLI flags share one definition

The system SHALL derive a CLI flag and interactive behavior from every generator prompt definition. A supplied CLI value SHALL be parsed and validated using the same prompt contract and SHALL take precedence over the interactive prompt.

#### Scenario: Complete non-interactive invocation

- **WHEN** every required prompt value is supplied as a CLI flag
- **THEN** the generator runs without presenting an interactive prompt

#### Scenario: Missing interactive value

- **WHEN** a required prompt value is absent in a TTY invocation
- **THEN** the system collects the value with the prompt's interactive behavior

#### Scenario: Missing non-interactive value

- **WHEN** a required prompt value is absent outside a TTY
- **THEN** the command exits with an error naming the required CLI flag

### Requirement: Prompt defaults remain visible interactively

The system SHALL show a prompt with its default value during an interactive run when no CLI value was supplied. A caller that supplies a CLI value SHALL bypass that prompt.

#### Scenario: Interactive default confirmation

- **WHEN** an interactive prompt has a default and no corresponding CLI flag
- **THEN** the terminal shows the prompt with that default available for confirmation or replacement

#### Scenario: CLI value overrides prompt default

- **WHEN** a CLI flag supplies a value for a prompt with a default
- **THEN** the supplied value is used without prompting
