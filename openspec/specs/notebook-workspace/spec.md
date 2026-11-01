# notebook-workspace Specification

## Purpose
TBD - created by archiving change 2026-11-01-extensibility-refactor. Update Purpose after archive.
## Requirements
### Requirement: Domain-owned notebook target

The active project and series used for saving SHALL live in a domain workspace,
not in a UI widget.

#### Scenario: Save target

- **WHEN** the user selects project A and series B and saves a creation
- **THEN** the checkpoint receives project A and series B
- **AND** the core save path does not read `controls.notebookPanel`

#### Scenario: Target deletion

- **WHEN** the active series is deleted
- **THEN** the save target falls back to the project without a series

### Requirement: Lineage is explicit

Manual notebook saves SHALL NOT inherit a parent automatically. Evolution SHALL
continue to pass explicit lineage.

#### Scenario: Cross-model manual save

- **WHEN** a Helix checkpoint exists and the user saves a Lissajous creation
- **THEN** the new checkpoint stores `generator.id = 'lissajous'`
- **AND** its `parentId` remains null
- **AND** the notebook displays its own model name

#### Scenario: Evolution child

- **WHEN** Evolution keeps a child generation
- **THEN** the explicit `parentId` and `parents` are preserved
- **AND** the item displays `parent:` metadata

