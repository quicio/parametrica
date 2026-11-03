## ADDED Requirements

### Requirement: Physical unit metadata

Fabrication validation and export SHALL use explicit physical unit metadata.

#### Scenario: Millimetres

- **WHEN** a mesh/solid is exported for fabrication in millimetres
- **THEN** its world scale is explicit
- **AND** validation tolerance has a documented unit
- **AND** no implicit unit conversion occurs

#### Scenario: Unitless

- **WHEN** physical units are absent
- **THEN** fabrication export cannot claim a physical size
- **AND** the result is rejected or clearly marked unitless
