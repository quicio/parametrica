## ADDED Requirements

### Requirement: Self-intersection-repaired source

Fabrication SHALL validate self-intersection-repaired geometry before export.

#### Scenario: Repaired source

- **WHEN** self-intersection repair produces a mesh
- **THEN** the self-intersection gate runs again
- **AND** the report identifies the repair strategy

#### Scenario: Remaining intersections

- **WHEN** intersections remain
- **THEN** STL export is rejected
- **AND** no partial file is written
