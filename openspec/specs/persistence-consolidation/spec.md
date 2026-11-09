# persistence-consolidation Specification

## Purpose
Define one explicit persistence model for session, notebook and user presets,
with safe migration and no duplicate document truth.
## Requirements
### Requirement: Store boundaries

Each persistent store SHALL have one documented responsibility.

#### Scenario: Session

- **WHEN** the document changes
- **THEN** only the session snapshot is updated
- **AND** notebook checkpoints are not mutated

#### Scenario: Notebook

- **WHEN** a checkpoint is saved
- **THEN** it owns its document and descriptor snapshot
- **AND** it does not depend on the current session

#### Scenario: Presets

- **WHEN** a user preset is saved
- **THEN** it owns a document snapshot
- **AND** it is not a live reference to the session

### Requirement: Migration

Legacy local storage SHALL migrate without data loss.

#### Scenario: Migration

- **WHEN** legacy keys exist
- **THEN** they are migrated idempotently
- **AND** a backup is retained for one release
- **AND** parse failure never deletes user data

### Requirement: Failure behavior

Storage failure SHALL be visible and non-destructive.

#### Scenario: Quota

- **WHEN** storage is full
- **THEN** the user sees an error
- **AND** the in-memory document remains usable

