# Spec Delta

## ADDED Requirements

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
