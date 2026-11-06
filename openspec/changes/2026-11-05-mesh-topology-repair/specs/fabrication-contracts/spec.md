## ADDED Requirements

### Requirement: Topology-repaired source

Fabrication SHALL validate topology-repaired geometry before export.

#### Scenario: Repaired source

- **WHEN** topology repair produces a mesh
- **THEN** manifold, orientation, self-intersection and volume gates run again
- **AND** the report identifies topology actions

#### Scenario: Remaining topology errors

- **WHEN** non-manifold edges or non-orientable topology remain
- **THEN** STL export is rejected
- **AND** no partial file is written
