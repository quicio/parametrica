## MODIFIED Requirements

### Requirement: Cell and strut controls

The generator SHALL expose cell size, strut diameter, rim, floor, height and
seed.

#### Scenario: Cell size

- **WHEN** the cell size changes
- **THEN** the number of cells changes inversely
- **AND** the network stays on the same surface

#### Scenario: Uniform cells

- **WHEN** the network is generated on a profile whose radius varies
- **THEN** seed density follows R²
- **AND** four Lloyd passes keep cell areas within a reasonable spread

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
