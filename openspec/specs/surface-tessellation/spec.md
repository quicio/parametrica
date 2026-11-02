# surface-tessellation Specification

## Purpose
TBD - created by archiving change 2026-11-01-parametric-surfaces. Update Purpose after archive.
## Requirements
### Requirement: Deterministic surface tessellation

A Surface SHALL tessellate into an indexed Mesh with stable topology.

#### Scenario: Open grid

- **WHEN** a Surface has `uCells × vCells` cells
- **THEN** the Mesh contains `uCells × vCells × 2` triangles
- **AND** vertices are shared between adjacent cells

#### Scenario: Closed seams

- **WHEN** a Surface dimension is closed
- **THEN** the duplicated seam samples are used by the boundary cells
- **AND** no crack or missing triangle is produced at the seam

#### Scenario: Repeated tessellation

- **WHEN** the same Surface is tessellated twice with the same options
- **THEN** vertices, faces and normals are equivalent

### Requirement: Mesh normals and winding

Tessellation SHALL produce consistent face winding and normals.

#### Scenario: Orientation

- **WHEN** the Surface domain orientation is consistent
- **THEN** adjacent faces use the same winding
- **AND** face normals point to the same side of the surface

#### Scenario: Vertex normals

- **WHEN** smooth normals are requested
- **THEN** vertex normals are area-weighted unit vectors
- **AND** duplicated seam vertices receive averaged normals

#### Scenario: Flat normals

- **WHEN** flat display is requested
- **THEN** face normals are available without changing vertex topology

### Requirement: Tessellation validation

The tessellator SHALL reject invalid grids.

#### Scenario: Non-rectangular grid

- **WHEN** a row length differs from the Surface column count
- **THEN** tessellation fails with a validation error
- **AND** no Mesh is emitted

#### Scenario: Non-finite point

- **WHEN** a grid point contains NaN or Infinity
- **THEN** tessellation fails
- **AND** the error identifies the grid coordinate

### Requirement: Twisted seam welding

Tessellation SHALL weld a reversed closed seam by mirroring the opposite
coordinate, without duplicating the seam boundary.

#### Scenario: Reversed U seam

- **WHEN** the U axis is closed with a reversed seam
- **THEN** the last grid row is welded to the first row with V mirrored
- **AND** seam vertices are shared between adjacent faces
- **AND** no crack or doubled boundary is produced

#### Scenario: Reversed V seam

- **WHEN** the V axis is closed with a reversed seam
- **THEN** the last grid column is welded to the first column with U mirrored

#### Scenario: Normal seams

- **WHEN** a closed seam uses the normal mode
- **THEN** the existing index-to-index weld is unchanged
- **AND** triangle counts and normals remain equivalent

#### Scenario: Seam metadata

- **WHEN** a twisted seam is welded
- **THEN** the mesh records `twistU` / `twistV`
- **AND** reports the unique welded row and column counts

### Requirement: Twisted compatibility curves

Wireframe compatibility curves SHALL follow a reversed seam instead of drawing
a false straight closure.

#### Scenario: Mirrored isolines

- **WHEN** compatibility curves are generated for a twisted closed axis
- **THEN** mirrored isolines are paired into closed loops
- **AND** each loop traverses the mirrored pair
- **AND** normal seams keep their previous open/closed flags

#### Scenario: Point budget

- **WHEN** paired loops exceed the curve point budget
- **THEN** the existing budget enforcement still applies
- **AND** the mesh wireframe pass remains available as the exact edge view

