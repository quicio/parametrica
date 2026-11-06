## ADDED Requirements

### Requirement: Hollow vase example

Fabricate SHALL include a solid-wall hollow vase example.

#### Scenario: Dimensions

- **WHEN** `Solid Vase 200` is loaded
- **THEN** the body is about 200 mm tall and 175 mm wide
- **AND** the mouth is about 135 mm
- **AND** the radial wall is 2.5 mm

#### Scenario: Construction

- **WHEN** the preset is evaluated
- **THEN** outer and inner surfaces become closed solids
- **AND** Manifold difference produces a hollow shell

#### Scenario: Fabrication

- **WHEN** Fabricate opens the preset
- **THEN** the report is exportable in millimetres
- **AND** the body has positive volume and triangle count

### Requirement: No lattice yet

The vase example SHALL be a solid wall, not a perforated lattice.

#### Scenario: Scope

- **WHEN** the preset is used
- **THEN** the wall is continuous
- **AND** the lattice remains a future capability
