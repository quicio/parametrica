## ADDED Requirements

### Requirement: Robust CSG source

Fabrication SHALL validate robust CSG results before export.

#### Scenario: Valid result

- **WHEN** a robust CSG strategy produces geometry
- **THEN** the standard fabrication gate runs again
- **AND** the report identifies strategy, fallback and volume delta

#### Scenario: Invalid or failed result

- **WHEN** the result fails validation or all strategies fail
- **THEN** STL/3MF export is rejected
- **AND** no partial file is written
