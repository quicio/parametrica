## ADDED Requirements

### Requirement: Typed lab model

The notebook, exploration and evolution models SHALL be strict TypeScript.

#### Scenario: Notebook

- **WHEN** checkpoints, projects, series and imports are loaded, added, moved,
  compared or persisted
- **THEN** records, storage, limits and results are typed
- **AND** hierarchy and storage behavior are unchanged

#### Scenario: Exploration

- **WHEN** selections, locks, sweeps, randomisation, grids or morphs produce
  candidates
- **THEN** refs, options, candidates and documents are typed
- **AND** candidate math is unchanged

#### Scenario: Evolution

- **WHEN** a generation is bred from parents
- **THEN** parents, crossovers, structural changes, children and validation are
  typed
- **AND** deterministic breeding is unchanged

### Requirement: Lab model compatibility

The old `lab/notebook.js`, `lab/exploration.js` and `lab/evolution.js` paths
SHALL keep resolving.

#### Scenario: Import

- **WHEN** App, Lab/Notebook panels or tests import the old paths
- **THEN** compatibility re-exports resolve
- **AND** behavior is unchanged
