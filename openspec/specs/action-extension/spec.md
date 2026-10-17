# action-extension Specification

## Purpose

Lets consumers add their own generator action types and handlers so a branded or
specialized tool can extend the generator engine without forking it.

## Requirements

### Requirement: Custom action types are added by module augmentation

The system SHALL allow a consumer to add new action type shapes to the generator
action union through module augmentation, so a generator can declare actions
beyond the built-in set and type-check against them.

#### Scenario: Augmented action type is accepted

- **WHEN** a consumer augments the action interface with a new action shape and
  declares a generator using it
- **THEN** the generator's action list accepts that action without a type error

#### Scenario: No augmentation leaves the built-in set

- **WHEN** a consumer does not augment the action interface
- **THEN** the generator action union contains only the built-in action types

### Requirement: Handler registration is an overlay over built-in handlers

When a caller supplies action handlers, the system SHALL merge them over the
built-in handlers so that supplying a custom handler keeps every built-in action
runnable.

#### Scenario: Custom handler does not displace built-ins

- **WHEN** a caller supplies only a handler for a custom action and runs a
  generator that also uses a built-in action
- **THEN** both the custom and the built-in action run

#### Scenario: Built-in actions run without supplied handlers

- **WHEN** a caller supplies no handlers and runs a generator using built-in
  actions
- **THEN** the built-in handlers run

### Requirement: An action with no registered handler fails atomically

The system SHALL fail the run before committing any staged file when an action's
type has no registered handler.

#### Scenario: Unhandled action aborts the run

- **WHEN** a generator contains an action whose type has no registered handler
- **THEN** the run fails and no staged file is written

### Requirement: Custom handlers share the staged run

The runtime SHALL pass each action handler the same run context used by the
built-in handlers, so a custom handler can read answered values, read prior
staged content, and stage its own output into the same commit.

#### Scenario: Custom handler stages into the shared commit

- **WHEN** a custom handler stages output through the provided run context
- **THEN** that output is committed together with output from other actions

#### Scenario: Custom handler reads staged content

- **WHEN** an earlier action staged content and a later custom handler reads the
  same path from the run context
- **THEN** the custom handler observes the staged content rather than stale disk
  content
