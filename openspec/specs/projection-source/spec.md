# projection-source Specification

## Purpose
Preserve an explicit, opt-in link from projected mesh vertices back to world
geometry and real orthographic depth without changing render behavior.
## Requirements
### Requirement: World preservation

Projected meshes SHALL be able to expose their canonical world vertices.

#### Scenario: Opt-in

- **WHEN** projection requests `preserveSource`
- **THEN** the projected mesh exposes a source sidecar
- **AND** world vertices are available by alias, not reconstructed from 2D

#### Scenario: Default

- **WHEN** projection does not request `preserveSource`
- **THEN** no source sidecar is allocated

### Requirement: Vertex identity

The source sidecar SHALL expose explicit source vertex indices.

#### Scenario: Mesh identity

- **WHEN** source vertices are inspected
- **THEN** each projected vertex maps to an explicit source index
- **AND** projected faces keep their indices

### Requirement: Orthographic depth

Orthographic projection SHALL preserve the dropped world coordinate.

#### Scenario: XY

- **WHEN** projection is XY
- **THEN** `orthoDepth` is `-z`

#### Scenario: XZ

- **WHEN** projection is XZ
- **THEN** `orthoDepth` is `-y`

#### Scenario: YZ

- **WHEN** projection is YZ
- **THEN** `orthoDepth` is `-x`

#### Scenario: Shared projected position

- **WHEN** two world vertices share projected X/Y but differ on the dropped axis
- **THEN** their `orthoDepth` values differ

### Requirement: Render compatibility

The source sidecar SHALL NOT alter projected render coordinates, faces, depth
or depthAlpha.

#### Scenario: Orthographic render

- **WHEN** source preservation is enabled
- **THEN** per-vertex `depth` remains the existing value
- **AND** painter ordering is unchanged

### Requirement: SurfaceMapping compatibility

Projection source SHALL identify the same mesh and vertex identities used by
SurfaceMapping.

#### Scenario: Mapping

- **WHEN** a mapped mesh is projected with source preservation
- **THEN** the source mesh id matches the mapping mesh id
- **AND** mapping indices remain valid

### Requirement: Lifecycle

Source sidecars SHALL be opt-in, derived on demand and not cached implicitly.

#### Scenario: Re-projection

- **WHEN** a previously preserved mesh is reprojected without preservation
- **THEN** any stale source sidecar is removed

#### Scenario: Cache

- **WHEN** a consumer caches projected meshes
- **THEN** `preserveSource` is part of its cache signature

### Requirement: Isolation

Source preservation SHALL NOT alter geometry, frame, bbox, RenderScene, render
or exports.

#### Scenario: Export

- **WHEN** SVG or plotter output is generated
- **THEN** it contains no projection source data

