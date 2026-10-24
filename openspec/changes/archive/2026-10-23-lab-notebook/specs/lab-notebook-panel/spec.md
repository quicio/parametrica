## Purpose

Give the user a durable, visual notebook: save the current figure, find it
later, compare two discoveries, understand what changed and move the notebook
between machines.

## ADDED Requirements

### Requirement: Save checkpoint from the current figure

The Notebook section SHALL expose a name field and a save action. Saving
SHALL capture the current document, descriptor, optional thumbnail, default
parent and timestamp.

#### Scenario: Save a checkpoint

- **WHEN** the user saves the current valid figure as “Rosette 01”
- **THEN** a checkpoint appears in the notebook list
- **AND** its name is “Rosette 01”
- **AND** its document hash matches the current descriptor

#### Scenario: Invalid figure

- **WHEN** the current evaluation has errors or no curves
- **THEN** saving is rejected with a visible notice
- **AND** the notebook is unchanged

#### Scenario: Parent lineage

- **WHEN** checkpoint B is saved while checkpoint A is the latest selection
- **THEN** `B.parentId === A.id`
- **AND** the list can show the A → B relationship

### Requirement: Notebook list

The panel SHALL list checkpoints newest-first with thumbnail, name, creation
date, tags and lineage indicator.

#### Scenario: Empty notebook

- **WHEN** there are no checkpoints
- **THEN** the panel shows an empty state with a save hint

#### Scenario: Thumbnail fallback

- **WHEN** a checkpoint has no thumbnail
- **THEN** the row shows a placeholder and remains restorable

#### Scenario: Many checkpoints

- **WHEN** the notebook exceeds the configured limit
- **THEN** the oldest checkpoints are removed to keep the limit

### Requirement: A/B comparison

The panel SHALL let the user select two checkpoints as A and B and show both
thumbnails, the document diff and the descriptor diff.

#### Scenario: Compare two forms

- **WHEN** A and B differ by `seed` and `fit`
- **THEN** the comparison lists those paths with old and new values
- **AND** it lists changed descriptor metrics with deltas

#### Scenario: Same checkpoint

- **WHEN** A and B are the same checkpoint
- **THEN** the panel says there is no change

#### Scenario: Incomplete selection

- **WHEN** fewer than two checkpoints are selected
- **THEN** the compare action is unavailable or explains what is missing

### Requirement: Restore and delete

The panel SHALL restore a checkpoint into the current document through the
normal history path and SHALL delete a checkpoint after confirmation.

#### Scenario: Restore is undoable

- **WHEN** the user restores checkpoint A and presses Undo
- **THEN** the document before restoration is recovered

#### Scenario: Delete

- **WHEN** the user deletes a checkpoint
- **THEN** it disappears from the list and no longer loads after reload

### Requirement: Persistence

The notebook SHALL persist in `localStorage` and SHALL survive a page reload.

#### Scenario: Reload

- **WHEN** the user saves two checkpoints and reloads
- **THEN** both are present with the same ids and document hashes

#### Scenario: Corrupt storage

- **WHEN** the localStorage entry is malformed
- **THEN** the app starts with an empty notebook instead of crashing

### Requirement: Export and import

The notebook SHALL export as versioned JSON and import valid checkpoints,
skipping invalid entries with a report.

#### Scenario: Round-trip

- **WHEN** a notebook with two checkpoints is exported and imported into an
  empty notebook
- **THEN** both checkpoints and their parent relationship are preserved

#### Scenario: Partial import

- **WHEN** an import contains one valid and one invalid checkpoint
- **THEN** the valid one is added
- **AND** the skipped one is reported

### Requirement: Thumbnail bounds

A stored thumbnail SHALL be a PNG data URL no larger than 65 536 characters.
Larger images SHALL be downscaled or omitted, never stored oversized.

#### Scenario: Oversized thumbnail

- **WHEN** a checkpoint is added with a 200 KB data URL
- **THEN** the stored thumbnail is `null` or downscaled below the cap
