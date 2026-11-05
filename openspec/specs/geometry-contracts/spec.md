# geometry-contracts Specification

## Purpose
Define the discriminated geometry data kinds and constructors shared by generators, operators, rendering and export.
## Requirements
### Requirement: Discriminated geometry contracts

Geometry results SHALL carry an explicit `kind`, `dimension` and validated
coordinates.

#### Scenario: Curve2D

- **WHEN** a 2D generator emits geometry
- **THEN** it returns `kind: 'curve2d'` with finite `{x,y}` points
- **AND** closed curves satisfy the seam rule

#### Scenario: Curve3D

- **WHEN** a spatial generator emits geometry
- **THEN** it returns `kind: 'curve3d'` with finite world `{x,y,z}` points
- **AND** it does not contain camera projection, depth or depthAlpha

#### Scenario: Unknown kind

- **WHEN** a stage returns an unrecognised `kind`
- **THEN** the pipeline rejects it with a keyed validation error
- **AND** no later stage receives partially valid geometry

### Requirement: Surface, Mesh and Solid contracts

The geometry layer SHALL define data contracts for surfaces, meshes and solids.

#### Scenario: Surface

- **WHEN** a surface is created
- **THEN** it stores a finite rectangular grid, a U/V domain and closure flags
- **AND** invalid grids are rejected

#### Scenario: Mesh

- **WHEN** a mesh is created
- **THEN** it stores finite vertices and face indices
- **AND** faces referencing out-of-range vertices are rejected

#### Scenario: Solid

- **WHEN** a solid is created
- **THEN** it references a boundary mesh and declares tolerance
- **AND** `closed` is a derived validation result, not a caller-provided hint
- **AND** it is only marked closed after the solid validator succeeds
- **AND** its validation record distinguishes closed, manifold, oriented,
  degenerate-face and optional self-intersection results

### Requirement: Geometry relations

The contracts SHALL define explicit conversions between geometry kinds.

#### Scenario: Lift curve

- **WHEN** a Curve2D is lifted
- **THEN** it becomes a Curve3D at `z = 0`

#### Scenario: Surface to mesh

- **WHEN** a Surface is tessellated
- **THEN** the result is a Mesh with valid vertices and faces

#### Scenario: Mesh to solid

- **WHEN** a Mesh is proposed as a Solid
- **THEN** conversion requires an effective topological validation
- **AND** a mesh flag alone is insufficient
- **AND** only a validated mesh can become a Solid with that mesh as boundary
