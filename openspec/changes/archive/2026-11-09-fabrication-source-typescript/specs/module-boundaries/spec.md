## ADDED Requirements

### Requirement: Typed fabrication source

The fabrication source resolver and report builder SHALL be strict TypeScript.

#### Scenario: Source resolution

- **WHEN** an evaluation is resolved into a fabrication source
- **THEN** layers, meshes, candidates and validation are typed
- **AND** null candidates are filtered before booleans and merges

#### Scenario: Report

- **WHEN** a report is built
- **THEN** units, bbox, printability, manufacturing and exportability are typed
- **AND** output values are unchanged

### Requirement: Fabrication compatibility

The old `application/fabricationSource.js` path SHALL keep resolving.

#### Scenario: Import

- **WHEN** jobs, tests or export call the old path
- **THEN** a compatibility re-export resolves
- **AND** behavior is unchanged
