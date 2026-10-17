# Spec Delta

## MODIFIED Requirements

### Requirement: Project configuration discovery

The system SHALL load the nearest `snipo.config.*` found from the invocation directory up to and including the project boundary. The boundary SHALL be the workspace root for a monorepo, or the nearest ancestor with `package.json` for a non-workspace project. A missing configuration SHALL produce an actionable error without searching outside that boundary.

#### Scenario: Configuration inherited from a monorepo root

- **WHEN** the command runs in a workspace package with no nearer configuration
- **THEN** the system loads the configuration at the workspace root

#### Scenario: A package configuration takes precedence

- **WHEN** a workspace package and its workspace root both contain a configuration
- **THEN** the system loads the package configuration

### Requirement: Interactive generator selection

The system SHALL show an interactive generator selection when no generator name is supplied in an interactive terminal. In a non-interactive environment, it SHALL fail and list the available generator names instead of waiting for input.

#### Scenario: Interactive selection

- **WHEN** a user runs `snipo` without a generator name from a TTY
- **THEN** the user can select one declared generator through the terminal interface

#### Scenario: Non-interactive selection failure

- **WHEN** automation runs `snipo` without a generator name
- **THEN** the command exits with an error that identifies the available generators

## ADDED Requirements

### Requirement: CLI program identity

The command-line program SHALL be invoked as `snipo`. Guidance and error messages that tell a user how to run or choose a generator SHALL name the `snipo` program.

#### Scenario: Guidance names the program

- **WHEN** the command reports that no generator was selected and lists the available generators
- **THEN** the message tells the user to run `snipo <generator>` to choose one
