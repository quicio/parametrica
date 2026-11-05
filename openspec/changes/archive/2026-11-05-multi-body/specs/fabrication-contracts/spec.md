## REMOVED Requirements

### Requirement: Single-body instance export

## ADDED Requirements

### Requirement: Explicit body scope

Fabrication SHALL export one body by default and several only when explicitly
requested.

#### Scenario: Default single body

- **WHEN** the user does not select a multi-body scope
- **THEN** Fabricate exports the first validated closed body from the active
  layer
- **AND** other visible instances are not included

#### Scenario: Multi-body scope

- **WHEN** the user selects active-layer or composition scope
- **THEN** only independently validated closed bodies are merged
- **AND** the merged mesh must pass topology and self-intersection validation

#### Scenario: Not a union

- **WHEN** bodies overlap
- **THEN** export is rejected instead of silently unioning them
- **AND** the UI does not claim a watertight single body
