## REMOVED Requirements

### Requirement: No lattice yet

**Reason**: The lattice is now a separate `Lattice Vase 200` example, while
`Solid Vase 200` remains a continuous solid wall.

## ADDED Requirements

### Requirement: Solid and lattice examples are separate

`Solid Vase 200` SHALL remain a continuous solid wall, while
`Lattice Vase 200` SHALL provide the openwork variant.

#### Scenario: Solid

- **WHEN** `Solid Vase 200` is used
- **THEN** the wall is continuous
- **AND** the lattice preparation is off

#### Scenario: Lattice

- **WHEN** `Lattice Vase 200` is used
- **THEN** its wall is the cellular strut network
- **AND** both examples remain independently selectable
