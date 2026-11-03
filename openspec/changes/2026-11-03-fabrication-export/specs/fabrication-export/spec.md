## Purpose

Produce a real, deterministic STL artifact from validated world geometry while
keeping fabrication separate from rendering and UI.

## ADDED Requirements

### Requirement: Binary STL export

The system SHALL export validated Mesh/Solid geometry as binary STL.

#### Scenario: Closed solid

- **WHEN** a validated solid is exported
- **THEN** the STL contains its facets, vertices and normals
- **AND** all values are finite

#### Scenario: Determinism

- **WHEN** the same geometry and scale are exported twice
- **THEN** the byte output is identical

### Requirement: Validation gate

Export SHALL NOT proceed for invalid fabrication geometry.

#### Scenario: Open mesh

- **WHEN** a mesh has open boundary edges
- **THEN** export is rejected
- **AND** the validation error identifies the boundary

#### Scenario: Non-manifold or inconsistent mesh

- **WHEN** topology or winding validation fails
- **THEN** no STL bytes are produced

### Requirement: Units

STL export SHALL use explicit physical scale.

#### Scenario: Millimetres

- **WHEN** `mmPerWorldUnit` is configured
- **THEN** exported vertices are scaled to millimetres
- **AND** world geometry is not mutated

#### Scenario: Missing scale

- **WHEN** physical scale is absent
- **THEN** export is rejected or marked unitless
- **AND** no implicit conversion is applied

### Requirement: Separation

STL export SHALL NOT depend on p5, camera, RenderScene or artboard state.

#### Scenario: Headless export

- **WHEN** a Solid is exported in Node without a renderer
- **THEN** export succeeds
- **AND** camera/view changes cannot affect the bytes
