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

