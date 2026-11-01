## ADDED Requirements

### Requirement: Notebook repository boundary

Notebook domain logic SHALL be independent from the storage implementation.

#### Scenario: Local repository

- **WHEN** the browser loads the notebook
- **THEN** `LocalNotebookRepository` reads and writes the existing localStorage
  key
- **AND** `Notebook` receives a parsed snapshot, not a storage handle

#### Scenario: Future repository

- **WHEN** a new repository implements `load`, `save` and `clear`
- **THEN** projects, series, checkpoints and migrations work unchanged

### Requirement: Versioned notebook migration

Notebook load SHALL migrate older snapshots through an explicit migration
function.

#### Scenario: Legacy flat notebook

- **WHEN** a v1 snapshot contains only checkpoints
- **THEN** an Inbox project is created
- **AND** every checkpoint is assigned to Inbox with no series

#### Scenario: Corrupt snapshot

- **WHEN** storage contains invalid JSON or an invalid snapshot
- **THEN** the app starts with an empty notebook in memory
- **AND** the existing storage is not overwritten before a successful parse
- **AND** the error is reported without crashing

### Requirement: Portable hierarchy

Export and import SHALL include projects, series and checkpoints.

#### Scenario: Round-trip

- **WHEN** a notebook with projects and series is exported and imported into an
  empty notebook
- **THEN** names, ids, ordering and checkpoint references are preserved

#### Scenario: Orphan reference

- **WHEN** an imported checkpoint references a missing project or series
- **THEN** the checkpoint moves to Inbox and loses the invalid series
