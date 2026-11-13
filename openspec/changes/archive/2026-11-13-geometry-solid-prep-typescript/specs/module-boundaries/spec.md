## ADDED Requirements

### Requirement: Typed solid preparation

Weld, boundary loops, caps, merge and prepareMesh SHALL be strict TypeScript.

#### Scenario: Prepare

- **WHEN** a fabrication mesh is welded, capped or merged
- **THEN** meshes, loops, stats and warnings are typed
- **AND** prepared geometry and stats are unchanged

### Requirement: Solid prep compatibility

The old `geometry/solidPrep.js` path SHALL keep resolving.

#### Scenario: Import

- **WHEN** modules import the old path
- **THEN** a compatibility re-export resolves
- **AND** behavior is unchanged
