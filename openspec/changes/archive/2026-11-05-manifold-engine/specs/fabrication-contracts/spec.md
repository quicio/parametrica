## ADDED Requirements

### Requirement: Manifold-derived source

Fabrication SHALL validate Manifold-derived geometry before export.

#### Scenario: Valid result

- **WHEN** Manifold produces a body
- **THEN** the standard mesh/fabrication gate runs
- **AND** the report identifies the Manifold engine

#### Scenario: Invalid result

- **WHEN** Manifold output fails validation
- **THEN** STL/3MF export is rejected
- **AND** no partial file is written
