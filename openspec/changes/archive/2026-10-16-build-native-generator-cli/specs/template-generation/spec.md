# Spec Delta

## Purpose

Generates predictable multi-file project changes from template directories while allowing users to inspect or safely commit the staged output.

## ADDED Requirements

### Requirement: Template directory generation

The system SHALL provide a directory-generation action that recursively processes a template directory into a destination below the generator base path. Template files ending in `.eta` SHALL be rendered and written without that final extension.

#### Scenario: Recursive template output

- **WHEN** a directory-generation action targets a tree containing nested `.eta` files
- **THEN** the system stages matching nested output files under the configured destination

### Requirement: Filesystem name placeholders

The system SHALL expand placeholders in template directory and file names before writing output. `{name}` SHALL resolve an input value and `{formatter:name}` SHALL apply the correspondingly named supported `change-case` formatter.

#### Scenario: Formatted output filename

- **WHEN** a template filename is `{pascalCase:name}.tsx.eta` and `name` is `user profile`
- **THEN** the staged output filename is `UserProfile.tsx`

#### Scenario: Unknown filename formatter

- **WHEN** a template name references an unsupported formatter
- **THEN** the action fails before committing any staged changes

### Requirement: Standard Eta content rendering

The system SHALL render generator configuration strings and template file contents with the standard Eta delimiters. Render contexts SHALL expose prompt values under `it.answers` and `change-case` formatters under `it.format`.

#### Scenario: Template content uses a formatter

- **WHEN** a template contains `<%= it.format.pascalCase(it.answers.name) %>`
- **THEN** the rendered output contains the PascalCase value of `name`

### Requirement: Generation remains within the base path

The system SHALL normalize each rendered destination and reject any action whose resulting path escapes the generator base path. The failure SHALL occur before filesystem changes are committed.

#### Scenario: Escaping path is rejected

- **WHEN** a rendered template name or destination resolves outside the generator base path
- **THEN** generation fails without writing files

### Requirement: Staged writes support previews and collision protection

The system SHALL stage all generated and modified files before committing them. Existing generated-file collisions SHALL fail by default, `--force` SHALL permit replacement, and `--dry-run` SHALL report staged changes without writing to disk.

#### Scenario: Existing file without force

- **WHEN** generation would create a file that already exists and `--force` is absent
- **THEN** the command fails without replacing the file

#### Scenario: Dry run

- **WHEN** a generator runs with `--dry-run`
- **THEN** the command reports the planned files and leaves the filesystem unchanged
