## ADDED Requirements

### Requirement: Repaired fabrication source

Fabrication SHALL validate repaired geometry through the same gate as authored
geometry.

#### Scenario: Repaired body

- **WHEN** explicit repair produces a mesh
- **THEN** it is validated before becoming exportable
- **AND** the report identifies the repair actions

#### Scenario: Failed repair

- **WHEN** repair cannot produce a closed, manifold, oriented,
  self-intersection-free mesh with positive volume
- **THEN** STL export is rejected
- **AND** no partial file is written
- **AND** the reason identifies the remaining validation error

#### Scenario: No silent repair

- **WHEN** repair is disabled
- **THEN** the exporter never cleans, caps, welds or reorients geometry
- **AND** the validation failure remains visible
