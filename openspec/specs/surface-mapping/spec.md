# surface-mapping Specification

## Purpose
Preserve a robust parametric correspondence between Surface cells and mesh
triangles without changing geometry, rendering, picking or exports.
## Requirements
### Requirement: Mapping generation

The system SHALL generate a `SurfaceMapping` alongside surface tessellation
from the same logical cells.

#### Scenario: Same cells

- **WHEN** a Surface is tessellated
- **THEN** each mesh triangle has a mapping entry
- **AND** the mapping cell/triangle indices come from the tessellation loop

### Requirement: Real domain

The mapping SHALL preserve the real U/V endpoints and topology flags.

#### Scenario: Non-normalized domain

- **WHEN** U or V uses values outside `[0,1]`
- **THEN** mapping UVs use those real values

#### Scenario: Inverted domain

- **WHEN** a domain end is lower than its start
- **THEN** the mapping preserves the real direction

### Requirement: Per-corner UV

UVs SHALL be stored per triangle corner, not per vertex.

#### Scenario: Closed seam

- **WHEN** a closed axis wraps a vertex index to the first row/column
- **THEN** the seam corner keeps the real `u1` or `v1` UV

#### Scenario: Reverse seam

- **WHEN** a closed axis uses a reverse seam
- **THEN** the mapping records the twist
- **AND** corner UVs remain the logical parameter values

#### Scenario: Shared vertex

- **WHEN** a seam vertex is shared by multiple triangles
- **THEN** those corners may carry different UVs

### Requirement: Mesh consistency

Mapping triangle indices SHALL match the corresponding mesh faces.

#### Scenario: Face order

- **WHEN** mapping faces are compared with mesh faces
- **THEN** indices match one-to-one

### Requirement: Storage and invalidation

The mapping SHALL be exposed as an evaluation sidecar and invalidated with the
mesh.

#### Scenario: Reevaluation

- **WHEN** Surface parameters or topology change
- **THEN** a new mapping is produced

#### Scenario: Stable cache

- **WHEN** the evaluation is unchanged
- **THEN** the cached mapping is reused

### Requirement: Isolation

The mapping SHALL NOT alter geometry, frame, bbox, RenderScene, render or
exports.

#### Scenario: Export

- **WHEN** SVG or plotter output is generated
- **THEN** it contains no mapping data

### Requirement: Validity

Invalid surfaces SHALL fail explicitly.

#### Scenario: Missing domain

- **WHEN** a Surface has no valid U/V range
- **THEN** tessellation/mapping fails with an explicit error

