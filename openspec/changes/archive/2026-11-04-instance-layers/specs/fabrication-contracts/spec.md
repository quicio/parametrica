## ADDED Requirements

### Requirement: Single-body instance export

Fabricate SHALL keep exporting a single body from the active layer.

#### Scenario: Active instance

- **WHEN** the active layer is an instance
- **THEN** Fabricate may export its first validated closed body
- **AND** it does not export other visible instances

#### Scenario: Warning

- **WHEN** a composition has multiple instances
- **THEN** Fabricate states that the composition is not multi-body
- **AND** export is not disabled merely because other instances are visible

#### Scenario: No multi-body promise

- **WHEN** the user expects the full composition
- **THEN** the UI and documentation state that multi-body and 3MF are not
  available in this phase
