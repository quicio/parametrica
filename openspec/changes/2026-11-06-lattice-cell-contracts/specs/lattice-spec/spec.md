## Purpose
Define a normalized, deterministic cellular network contract for organic
lattice generation, with metric-aware cell sizing, controlled irregularity, opening width
estimates and a single source of truth for preview and fabrication.

## ADDED Requirements

### Requirement: Normalized lattice spec

The geometry layer SHALL define a serializable, versioned `LatticeSpec`.

#### Scenario: Normalization

- **WHEN** generator parameters are normalized
- **THEN** the spec carries surface, cell, clearance and budget sections
- **AND** it carries an `algorithmVersion`
- **AND** unknown fields are ignored
- **AND** numeric ranges are clamped

#### Scenario: Compatibility

- **WHEN** an older document has no new lattice fields
- **THEN** defaults are applied
- **AND** the document version does not change

#### Scenario: Bad density expression

- **WHEN** a density expression cannot be compiled
- **THEN** a uniform density is used
- **AND** the spec reports the failure

### Requirement: Metric-aware cell field

The network SHALL distribute cells according to the real surface area and the
local target size, using an explicitly approximate unrolled metric.

#### Scenario: Surface area

- **WHEN** the profile radius varies with height
- **THEN** cell areas are measured on the surface of revolution
- **AND** a nominal cylinder radius alone is not used as the area metric

#### Scenario: Metric approximation

- **WHEN** the network is built with `X = θ·R_ref`
- **THEN** the approximation is reported as non-geodesic
- **AND** area targets are still measured on the surface
- **AND** the implementation does not claim geodesic Voronoi distances

#### Scenario: Target size

- **WHEN** `targetSize` changes
- **THEN** the cell count changes inversely
- **AND** `targetSize` is interpreted as a characteristic cell pitch
- **AND** the reported equivalent cell diameter is used for quality checks

#### Scenario: Density

- **WHEN** `density` increases
- **THEN** seed density increases
- **AND** mean cell area decreases monotonically

#### Scenario: Aspect

- **WHEN** `aspect` differs from 1
- **THEN** cells stretch in the chosen direction
- **AND** measured surface areas remain valid

### Requirement: Controlled organic distribution

The distribution SHALL allow controlled irregularity without unconstrained
noise.

#### Scenario: Irregularity

- **WHEN** `irregularity` increases from 0 to 1
- **THEN** cell shapes vary more
- **AND** degenerate cells are rejected
- **AND** a minimum seed separation is preserved

#### Scenario: Relaxation

- **WHEN** `relaxation` increases
- **THEN** cell areas become more uniform
- **AND** the resulting network is deterministic

#### Scenario: Seed

- **WHEN** the seed changes
- **THEN** the layout changes
- **AND** the target size range is preserved

### Requirement: Cells, nodes, edges and openings

The network SHALL expose stable derived topology and opening geometry.

#### Scenario: Network

- **WHEN** the network is built
- **THEN** it contains nodes, edges, cells, bands, statistics and
  `algorithmVersion`
- **AND** nodes reference world positions and UV parameters
- **AND** edges reference two node ids and their samples

#### Scenario: Openings

- **WHEN** cells are produced
- **THEN** each cell has an opening polygon inset by half the strut diameter
- **AND** its estimated free width and opening area are reported
- **AND** the area is diagnostic, not the manufacturing criterion

#### Scenario: Minimum opening

- **WHEN** an opening width is below `minOpeningWidth`
- **THEN** the cell is merged with a neighbour or marked invalid
- **AND** the event is reported
- **AND** the estimate is not presented as a printability guarantee

#### Scenario: Identity

- **WHEN** the same spec and `algorithmVersion` are rebuilt
- **THEN** node, edge and cell ids are identical
- **AND** ids are only promised within that generation
- **AND** ids are not promised across seeds, parameter changes, topology
  changes or algorithm versions

### Requirement: Determinism and cache

The network SHALL be deterministic and cacheable by its spec.

#### Scenario: Rebuild

- **WHEN** the same spec is built twice
- **THEN** the network hash and geometry are identical

#### Scenario: Cache

- **WHEN** only camera, style or preview mode changes
- **THEN** the network is not rebuilt
- **WHEN** cell parameters or the seed change
- **THEN** the network is rebuilt

### Requirement: Single source of truth

Preview, fabrication and perforation SHALL consume the same network contract.

#### Scenario: Preview

- **WHEN** the generator emits its preview
- **THEN** it emits one `curve3d` per network edge
- **AND** the curves carry the network/spec identity

#### Scenario: Fabrication

- **WHEN** Fabricate builds a lattice solid
- **THEN** it uses the same network or rebuilds from the same spec
- **AND** it does not infer a different network from the preview curves

#### Scenario: Perforation

- **WHEN** the cutout mode requests holes
- **THEN** it uses the same seeds, cell centroids or cells
- **AND** the pattern identity is preserved

### Requirement: Budgets and diagnostics

The network SHALL enforce budgets and report quality metrics.

#### Scenario: Budget

- **WHEN** the cell or edge count exceeds the budget
- **THEN** the builder returns a structured complexity error
- **AND** does not hang the UI

#### Scenario: Statistics

- **WHEN** a network is built
- **THEN** it reports cell counts, interior area CV, opening width range, edge
  length range, iterations, algorithm version and generation time
- **AND** boundary cells are counted separately
- **AND** cells below the opening target are counted

### Requirement: Distribution-only scope

The Phase 1 network SHALL NOT require finish-only parameters.

#### Scenario: Finish parameters absent

- **WHEN** only cell distribution parameters are present
- **THEN** the network builds without strut radius, joint style or finish
  quality parameters
- **AND** finish-only parameters do not alter cell geometry
