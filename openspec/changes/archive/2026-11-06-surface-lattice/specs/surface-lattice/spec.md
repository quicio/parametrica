## Purpose

Generate a deterministic cellular strut network on a surface of revolution and
turn it into a closed, fabricable solid without leaving the Parametrica
document and fabrication contracts.

## ADDED Requirements

### Requirement: Deterministic network

The `surface-lattice` generator SHALL emit a seeded cellular network on a
surface of revolution.

#### Scenario: Determinism

- **WHEN** the same profile, parameters and seed are evaluated twice
- **THEN** the curves are identical

#### Scenario: Seed

- **WHEN** the seed changes
- **THEN** the cell layout changes
- **AND** the cell size range is preserved

#### Scenario: Surface

- **WHEN** the network is generated
- **THEN** every point lies on `R(z / height)` within tolerance
- **AND** the network spans from the floor to the mouth

#### Scenario: Edges

- **WHEN** the network is sampled
- **THEN** every output is a world `curve3d`
- **AND** each curve is one shared cell edge

### Requirement: Cell and strut controls

The generator SHALL expose cell size, strut diameter, rim, floor, height and
seed.

#### Scenario: Cell size

- **WHEN** the cell size changes
- **THEN** the number of cells changes inversely
- **AND** the network stays on the same surface

#### Scenario: Strut

- **WHEN** the strut diameter changes
- **THEN** the viewport network is unchanged
- **AND** the fabricated tube radius follows the new value

### Requirement: Fabricable solid

Fabricate SHALL turn the network into one closed solid.

#### Scenario: Tubes

- **WHEN** the lattice preparation is enabled
- **THEN** every curve becomes a closed tube
- **AND** a solid floor and rim close the ends

#### Scenario: Union

- **WHEN** the tubes, floor and rim are combined
- **THEN** Manifold produces one body
- **AND** the result is closed, manifold and has positive volume

#### Scenario: Micro cracks

- **WHEN** the union leaves a boundary loop smaller than 0.1 mm
- **THEN** the builder caps that loop
- **AND** larger holes still fail validation

#### Scenario: Export

- **WHEN** the body is exported as STL
- **THEN** the triangle count matches the report
- **AND** the units are millimetres

### Requirement: Worker routing

Lattice preparation SHALL run in the existing heavy fabrication worker.

#### Scenario: Job

- **WHEN** the lattice flag is enabled
- **THEN** the job is treated as heavy
- **AND** progress and cancel stay available
