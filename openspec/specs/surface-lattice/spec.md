# surface-lattice Specification

## Purpose
Generate a deterministic cellular strut network on a surface of revolution and
turn it into a closed, fabricable solid without leaving the Parametrica
document and fabrication contracts.
## Requirements
### Requirement: Deterministic network

The `surface-lattice` generator SHALL derive a deterministic seeded cellular
network from a normalized `LatticeSpec` on a surface of revolution.

#### Scenario: Determinism

- **WHEN** the same profile, parameters and seed are evaluated twice
- **THEN** the network, edges and preview curves are identical

#### Scenario: Seed

- **WHEN** the seed changes
- **THEN** the cell layout changes
- **AND** the target cell-size range is preserved

#### Scenario: Surface

- **WHEN** the network is generated
- **THEN** every node and edge sample lies on `R(z / height)` within tolerance
- **AND** the network spans from the floor to the mouth
- **AND** boundary cells are flagged separately

#### Scenario: Edges

- **WHEN** the preview is emitted
- **THEN** every output is a world `curve3d`
- **AND** each curve is one shared cell edge
- **AND** edge identity derives from the network contract

### Requirement: Cell and strut controls

The generator SHALL expose target cell size, density, irregularity, relaxation,
aspect, seed, strut diameter, minimum opening width, rim, floor and height.

#### Scenario: Cell size

- **WHEN** the target cell size changes
- **THEN** the cell count changes inversely
- **AND** `targetSize` is treated as a characteristic cell pitch
- **AND** interior cells stay near the requested size within the measured
  tolerance

#### Scenario: Organic distribution

- **WHEN** irregularity or relaxation changes
- **THEN** the cell distribution changes in a controlled way
- **AND** no degenerate cells are emitted

#### Scenario: Uniform cells

- **WHEN** the network is generated on a profile whose radius varies
- **THEN** cell areas are measured on the surface
- **AND** interior cell-area CV is reported
- **AND** boundary cells are excluded from that metric
- **AND** the unrolled `X = θ·R_ref` metric is reported as approximate, not
  geodesic

#### Scenario: Strut

- **WHEN** the strut diameter changes
- **THEN** the centerline network is unchanged
- **AND** the opening inset and the fabricated tube radius follow the new value

#### Scenario: Opening

- **WHEN** a cell opening width would fall below `minOpeningWidth`
- **THEN** the cell is merged or reported as invalid
- **AND** the network stats record the event
- **AND** the estimate is not presented as a manufacturing guarantee

### Requirement: Fabricable solid

Fabricate SHALL turn the network into one closed solid.

#### Scenario: Tubes

- **WHEN** the lattice preparation is enabled
- **THEN** every curve becomes a closed tube
- **AND** a solid floor and rim close the ends

#### Scenario: Rounded joints

- **WHEN** three or more tubes meet at a vertex
- **THEN** a low-poly sphere fills the junction
- **AND** all junction spheres are packed into one operand
- **AND** spheres that would overlap are skipped

#### Scenario: Union

- **WHEN** the tubes, joints, floor and rim are combined
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

