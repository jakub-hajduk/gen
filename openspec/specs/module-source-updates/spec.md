# module-source-updates Specification

## Purpose

Updates imports and exports in supported source modules without unsafe text replacement or changes to module evaluation order.

## Requirements

### Requirement: Supported source module formats

The system SHALL support source-update actions for `.ts`, `.tsx`, `.js`, and `.jsx` files. It SHALL reject unsupported file extensions with an actionable error before committing staged changes.

#### Scenario: TypeScript source update

- **WHEN** an import-update action targets a `.tsx` file
- **THEN** the system stages the requested import update

#### Scenario: Unsupported source update

- **WHEN** an import-update action targets a `.json` file
- **THEN** the action fails without changing that file

### Requirement: Import updates merge and sort members safely

The system SHALL merge a requested named import into an existing declaration for the same module when possible and SHALL alphabetize named members within that declaration. It SHALL not reorder existing module declarations.

#### Scenario: Named import is merged

- **WHEN** a file imports `Button` from `./ui` and an action adds `Card` from `./ui`
- **THEN** the declaration contains alphabetized `Button` and `Card` members

#### Scenario: New module import preserves declaration order

- **WHEN** an action adds an import from a module not already imported
- **THEN** existing import declarations retain their original relative order

### Requirement: Side-effect imports remain untouched

The system SHALL not merge into, move, or reorder side-effect-only imports while applying source-update actions.

#### Scenario: Side-effect import is preserved

- **WHEN** a source file contains `import './initialize-runtime'`
- **THEN** an import-update action leaves that declaration in place and unchanged

### Requirement: Export updates merge and sort members safely

The system SHALL merge requested named exports that share an existing source module and SHALL alphabetize members within that export declaration. It SHALL preserve the relative order of existing export declarations.

#### Scenario: Named export is merged

- **WHEN** a file exports `Button` from `./Button` and an action adds `ButtonProps` from `./Button`
- **THEN** the declaration contains alphabetized `Button` and `ButtonProps` members

### Requirement: Source updates are staged before commit

The system SHALL add parsed source updates to the same staged change set as generated files. A source parse or update failure SHALL prevent the run from committing any staged changes.

#### Scenario: Source update fails after generated files are staged

- **WHEN** a later source-update action cannot parse its target file
- **THEN** the command reports the failure and does not commit the generated files or source update
