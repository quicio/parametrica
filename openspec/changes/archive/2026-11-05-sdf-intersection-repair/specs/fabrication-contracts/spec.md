## ADDED Requirements

### Requirement: SDF-repaired source

Fabrication SHALL validate SDF-repaired geometry before export.

#### Scenario: Valid result

- **WHEN** SDF repair produces a body
- **THEN** the standard gate runs
- **AND** the report identifies the SDF strategy

#### Scenario: Failed result

- **WHEN** SDF repair fails
- **THEN** STL/3MF export is rejected
