## ADDED Requirements

### Requirement: Typed notebook panel

The notebook panel SHALL be strict TypeScript.

#### Scenario: Manage checkpoints

- **WHEN** checkpoints are saved, organized, edited, compared or restored
- **THEN** checkpoints, projects, series, diffs and ports are typed
- **AND** notebook behavior is unchanged

### Requirement: Notebook compatibility

The old `ui/widgets/NotebookPanel.js` path SHALL keep resolving.

#### Scenario: Import

- **WHEN** keep sections import the old path
- **THEN** a compatibility re-export resolves
- **AND** notebook-port checks read the typed module
