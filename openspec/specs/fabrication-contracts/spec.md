# fabrication-contracts Specification

## Purpose
Validate mesh and solid geometry before fabrication consumers may render or export it.
## Requirements
### Requirement: Mesh validation

The geometry layer SHALL validate mesh data before it can be rendered or
exported for fabrication.

#### Scenario: Invalid index

- **WHEN** a face references a vertex outside the vertex array
- **THEN** the mesh is rejected with a validation error

#### Scenario: Degenerate face

- **WHEN** a face has fewer than three distinct vertices
- **THEN** the mesh is rejected or the face is reported for repair
- **AND** it is not silently exported

### Requirement: Solid validation

A Solid SHALL only be considered closed after effective topological validation.
The `closed` flag SHALL NOT be accepted as sufficient evidence.

#### Scenario: Closed manifold mesh

- **WHEN** a mesh boundary is watertight, edge-consistent, consistently
  oriented and free of degenerate faces within tolerance
- **THEN** it can be promoted to a Solid
- **AND** the validation record reports the checks that passed

#### Scenario: Open mesh

- **WHEN** a mesh boundary has open edges
- **THEN** it remains a Mesh
- **AND** solid export is rejected
- **AND** the error identifies the open boundary

#### Scenario: Non-manifold or inconsistent mesh

- **WHEN** an edge is shared by an invalid number of faces or face winding is
  contradictory
- **THEN** solid promotion is rejected
- **AND** the validation record identifies the failing topology

#### Scenario: Degenerate faces

- **WHEN** a mesh contains zero-area or repeated-vertex faces
- **THEN** solid promotion is rejected or the faces are explicitly reported for
  repair
- **AND** a mesh is never silently promoted

#### Scenario: Self-intersections

- **WHEN** the validator supports self-intersection checks and intersections
  are found
- **THEN** the solid result is rejected or marked invalid
- **AND** the limitation is recorded when the validator cannot check it

#### Scenario: Volume consistency

- **WHEN** signed volume can be computed
- **THEN** the validation record includes volume and orientation consistency
- **AND** inconsistent or non-finite volume prevents solid promotion

#### Scenario: Closed flag is not validation

- **WHEN** a caller supplies `closed: true` without running the validator
- **THEN** the geometry remains a Mesh
- **AND** it cannot be exported as a Solid

### Requirement: Fabrication export adapters

STL and 3MF SHALL be implemented as geometry exporters, not renderers.

#### Scenario: STL contract

- **WHEN** STL export is added
- **THEN** it consumes world Mesh/Solid data
- **AND** it does not use p5, camera or document.view

#### Scenario: Units and tolerance

- **WHEN** a mesh or solid is exported
- **THEN** its metadata declares units and tolerance
- **AND** validation uses the same tolerance

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

### Requirement: STL exporter gate

STL export SHALL be a geometry consumer with an explicit validation gate.

#### Scenario: Validation before output

- **WHEN** an STL exporter is invoked
- **THEN** fabrication validation runs first
- **AND** invalid geometry produces no partial file

#### Scenario: Unit declaration

- **WHEN** a file is produced
- **THEN** the surrounding export metadata declares the physical unit/scale
- **AND** STL itself is not misrepresented as carrying a unit field

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

### Requirement: Prepared fabrication source

Fabrication SHALL evaluate prepared geometry through the same validation gate
as authored geometry.

#### Scenario: Prepared body

- **WHEN** explicit preparation produces a mesh
- **THEN** it is validated before becoming exportable
- **AND** the report identifies that the source was prepared

#### Scenario: Failed preparation

- **WHEN** the prepared mesh is open, non-manifold, inconsistently oriented,
  degenerate or has invalid volume
- **THEN** STL export is rejected
- **AND** no partial file is written

#### Scenario: No silent repair

- **WHEN** preparation is disabled
- **THEN** the exporter never repairs or caps geometry
- **AND** the open-mesh rejection reason remains visible

