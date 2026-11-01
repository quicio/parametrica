## MODIFIED Requirements

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

## ADDED Requirements

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
