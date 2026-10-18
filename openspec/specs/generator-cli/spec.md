# generator-cli Specification

## Purpose

Provides a deterministic generator command line that works equally for interactive users and non-interactive automation.

## Requirements

### Requirement: Project configuration discovery

The system SHALL load the nearest `gen.config.*` found from the invocation directory up to and including the project boundary. The boundary SHALL be the workspace root for a monorepo, or the nearest ancestor with `package.json` for a non-workspace project. A missing configuration SHALL produce an actionable error without searching outside that boundary.

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

- **WHEN** a user runs `gen` without a generator name from a TTY
- **THEN** the user can select one declared generator through the terminal interface

#### Scenario: Non-interactive selection failure

- **WHEN** automation runs `gen` without a generator name
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

### Requirement: Generator sources are glob patterns

The system SHALL read the configuration's `generators` field as a flat array of
glob patterns. Each pattern SHALL expand relative to the directory that contains
the loaded configuration. The system SHALL reject a configuration whose
`generators` entry is not a string.

#### Scenario: Glob expands relative to the configuration directory

- **WHEN** a configuration declares `generators: ['./generators/**/*.generator.ts']`
  and the command runs from a project subdirectory
- **THEN** matching generator modules are discovered below the configuration
  directory

#### Scenario: Non-string entry is rejected

- **WHEN** `generators` contains an entry that is not a string
- **THEN** the command fails with an error that names the configuration file and
  the expected shape

#### Scenario: No matches

- **WHEN** no glob pattern matches any generator module
- **THEN** the command fails and reports that no generators are defined

### Requirement: Generator modules are flattened

The system SHALL import every matched module and flatten its exported generators,
recursively descending default exports, named exports, arrays, and objects with a
`generators` array. An export SHALL be recognized as a generator only when it
carries the generator brand. A matched module that exports no generator SHALL be
ignored.

#### Scenario: Default export array

- **WHEN** a matched module default-exports an array of generators
- **THEN** each generator becomes a separately runnable generator

#### Scenario: Named exports

- **WHEN** a matched module named-exports several generators
- **THEN** each generator becomes a separately runnable generator

#### Scenario: Plugin object

- **WHEN** a matched module default-exports an object with a `generators` array
- **THEN** the generators in that array become runnable

#### Scenario: Nested exports

- **WHEN** a matched module nests arrays or plugin objects inside one another
- **THEN** the system descends recursively and collects every branded generator

#### Scenario: Non-generator file is ignored

- **WHEN** a matched file exports no branded generator
- **THEN** it contributes nothing and does not fail the run

#### Scenario: Command name is independent of the file name

- **WHEN** a generator is discovered from any module
- **THEN** its CLI command is its `name`, and the file name does not affect it

### Requirement: Duplicate generators are resolved

The system SHALL load only unique generators. The same generator object reached
through multiple glob patterns, modules, or re-exports SHALL be included once.
Two distinct generators that declare the same `name` SHALL fail the run.

#### Scenario: Identity deduplication

- **WHEN** the same generator is reached through two glob patterns
- **THEN** it appears in the generator list only once

#### Scenario: Re-export deduplication

- **WHEN** a barrel module re-exports a generator that a glob also matches directly
- **THEN** the generator appears only once

#### Scenario: Name conflict fails

- **WHEN** two distinct generators declare the same `name`
- **THEN** the command fails and names the files that supplied each generator

#### Scenario: Deterministic ordering

- **WHEN** several glob patterns and modules match
- **THEN** generators appear in glob order, matched files are sorted by path, and
  exports keep their module order

### Requirement: CLI program identity

The command-line program SHALL be invoked as `gen`. Guidance and error messages that tell a user how to run or choose a generator SHALL name the `gen` program.

#### Scenario: Guidance names the program

- **WHEN** the command reports that no generator was selected and lists the available generators
- **THEN** the message tells the user to run `gen <generator>` to choose one
