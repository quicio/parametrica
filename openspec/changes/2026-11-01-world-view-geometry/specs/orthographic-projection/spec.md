## MODIFIED Requirements

### Requirement: Projection availability

Orthographic projections SHALL be available when the active generator declares
a spatial capability and the evaluated geometry is `Curve3D`.

#### Scenario: Spatial generator

- **WHEN** the active generator declares `capabilities.spatial = true`
- **THEN** the projection selector is enabled
- **AND** the view layer consumes world `Curve3D` coordinates

#### Scenario: Planar generator

- **WHEN** the active generator does not declare a spatial capability
- **THEN** the projection selector is disabled with an explanation
- **AND** the camera view remains active

#### Scenario: Switching to 2D

- **WHEN** a projected spatial document is replaced by a 2D document
- **THEN** `view.projection` resets to `3d`

#### Scenario: Export

- **WHEN** an SVG is exported from an orthographic view
- **THEN** it uses the same projected world geometry as the canvas

## ADDED Requirements

### Requirement: World-space orthographic projection

Orthographic projections SHALL be computed from canonical world coordinates,
not from optional per-point legacy metadata.

#### Scenario: XY

- **WHEN** projection is `xy`
- **THEN** the view discards world Z

#### Scenario: XZ

- **WHEN** projection is `xz`
- **THEN** the view discards world Y

#### Scenario: YZ

- **WHEN** projection is `yz`
- **THEN** the view discards world X
