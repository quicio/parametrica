# lab-notebook Specification

## Purpose
Make discoveries durable: every kept form can be reproduced exactly, compared
with another form, named, tagged, annotated and recovered after reload.
## Requirements
### Requirement: Checkpoint schema

The system SHALL store checkpoints with `version`, `id`, `name`, `createdAt`,
`document`, `descriptor`, `thumbnail`, `parentId`, `parents`, `generation`,
`tags`, `notes`, `projectId`, `seriesId` and `order`.

#### Scenario: Create a checkpoint

- **WHEN** the user saves the current valid figure as “Rosette 01”
- **THEN** the checkpoint contains the full sanitised document
- **AND** its descriptor matches the current figure
- **AND** it stores the active project and optional series

#### Scenario: Reject an invalid document

- **WHEN** the current document evaluates with errors
- **THEN** saving is rejected with a visible message
- **AND** no checkpoint is written

### Requirement: Checkpoint reproducibility

Restoring a checkpoint SHALL reproduce the same world geometry as the moment it
was created, given the same engine version and seed.

#### Scenario: Round-trip geometry

- **WHEN** a checkpoint is restored immediately after saving
- **THEN** its world geometry matches the saved intent
- **AND** camera orientation does not alter the checkpoint's world geometry

#### Scenario: Restore after reload

- **WHEN** the page reloads and the notebook is loaded from storage
- **THEN** restoring a checkpoint produces the same world document hash

### Requirement: Thumbnails are cache only

A checkpoint SHALL store an optional PNG data URL thumbnail of at most
256×256 pixels and 64 KB. Thumbnails SHALL NOT be required to restore a
checkpoint.

#### Scenario: Missing thumbnail

- **WHEN** a checkpoint has `thumbnail = null`
- **THEN** it can still be restored and compared

#### Scenario: Thumbnail size limit

- **WHEN** a generated thumbnail exceeds 64 KB
- **THEN** it is downscaled or dropped, never stored oversized

### Requirement: Lineage

Checkpoints SHALL support `parentId`, forming an acyclic directed graph.

#### Scenario: Parent-child lineage

- **WHEN** checkpoint B is created from A
- **THEN** `B.parentId === A.id`
- **AND** the notebook can display the chain A → B

#### Scenario: Cycle prevention

- **WHEN** an operation would make a checkpoint its own ancestor
- **THEN** the operation is rejected

### Requirement: A/B comparison

The notebook SHALL compare two checkpoints and show both thumbnails, the
parameter diff and the descriptor diff.

#### Scenario: Compare two forms

- **WHEN** the user compares A and B
- **THEN** the panel shows the changed parameter paths with old/new values
- **AND** it shows descriptor deltas for changed metrics

#### Scenario: Same checkpoint twice

- **WHEN** A and B are the same checkpoint
- **THEN** the diff is empty and the UI says there is no change

### Requirement: Notes, tags and naming

Checkpoints SHALL support a non-empty name, free-form notes and a set of
tags. Names need not be unique, but the UI SHALL disambiguate duplicates.

#### Scenario: Tag filter

- **WHEN** the user filters by tag `symmetry`
- **THEN** only checkpoints carrying that tag are listed

### Requirement: Persistence and portability

The notebook SHALL persist locally and SHALL export/import as a versioned
JSON document. Import SHALL validate every checkpoint and skip invalid ones
with a report.

#### Scenario: Persist and reload

- **WHEN** the user saves a checkpoint and reloads the page
- **THEN** the checkpoint is present with the same id and document hash

#### Scenario: Export/import round-trip

- **WHEN** a notebook is exported and imported into an empty notebook
- **THEN** every checkpoint is preserved
- **AND** parent relationships are preserved

#### Scenario: Corrupt import

- **WHEN** an imported notebook contains one invalid checkpoint
- **THEN** valid checkpoints load and the invalid one is reported

### Requirement: World-space descriptors for spatial geometry

For spatial geometry, descriptor and comparison metrics SHALL be computed from
world geometry when the world descriptor lands.

#### Scenario: Camera-independent metrics

- **WHEN** a 3D creation is saved after rotating the camera
- **THEN** its world descriptor does not change because of camera rotation

#### Scenario: Compatibility period

- **WHEN** the legacy projected descriptor is still active
- **THEN** the notebook reports that camera changes do not change the saved
  document, but descriptor comparison remains screen-based until migration is
  complete

### Requirement: Projects and series

The notebook SHALL organize checkpoints into projects, with optional series
inside each project, while preserving lineage separately.

#### Scenario: Nested creation

- **WHEN** a creation is saved into project A and series B
- **THEN** it appears under project A → series B
- **AND** `parentId` is not used as the organizational parent

#### Scenario: Delete project

- **WHEN** a non-Inbox project is deleted
- **THEN** its creations move to Inbox
- **AND** their documents are not deleted

#### Scenario: Delete series

- **WHEN** a series is deleted
- **THEN** its creations stay in the same project without a series

#### Scenario: Legacy notebook

- **WHEN** a notebook without projects is loaded
- **THEN** an Inbox project is created
- **AND** every existing checkpoint moves to Inbox

