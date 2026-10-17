# Spec Delta

## ADDED Requirements

### Requirement: Template source resolves from the defining module directory

The `addTemplates` source directory (`from`) SHALL resolve relative to the
directory of the module that defined the running generator. When that module sits
in the same directory as the loaded configuration, the source SHALL resolve as it
did relative to the configuration directory. Output paths SHALL remain anchored
to the generator base path.

#### Scenario: Module-local templates

- **WHEN** a generator defined in `generators/component.ts` uses
  `from: './templates/component'`
- **THEN** templates are read from `generators/templates/component`

#### Scenario: Config-adjacent module

- **WHEN** the defining module sits next to the configuration file
- **THEN** `from` resolves relative to that shared directory

#### Scenario: First discovered module wins

- **WHEN** the same generator is reached through more than one module
- **THEN** the source directory is the directory of the first module that
  supplied the generator

#### Scenario: Output anchoring is unchanged

- **WHEN** the source resolves from a module directory elsewhere in the project
- **THEN** generated output is still written below the generator base path
