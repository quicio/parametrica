## ADDED Requirements

### Requirement: Typed core infrastructure

The core history, persistence and session modules SHALL be strict TypeScript.

#### Scenario: History

- **WHEN** document snapshots are recorded, undone or redone
- **THEN** the bounded history is typed
- **AND** its limit and stack behavior are unchanged

#### Scenario: Persistence and migration

- **WHEN** storage is read, written, backed up or migrated
- **THEN** the storage boundary and migration result are typed
- **AND** keys, order and error reporting are unchanged

#### Scenario: Session

- **WHEN** a document snapshot is scheduled, flushed, saved or loaded
- **THEN** the debounced session store is typed
- **AND** the saved payload shape is unchanged

### Requirement: Typed notebook repository

The notebook storage boundary SHALL be strict TypeScript.

#### Scenario: Notebook persistence

- **WHEN** the notebook loads, saves or clears a snapshot
- **THEN** local and memory repositories are typed
- **AND** the notebook migration is typed

### Requirement: Core compatibility

The old `core/history.js`, `core/persistence.js`, `core/session.js` and
`lab/notebookRepository.js` paths SHALL keep resolving.

#### Scenario: Import

- **WHEN** App, panels, lab or tests import the old paths
- **THEN** compatibility re-exports resolve
- **AND** behavior is unchanged
