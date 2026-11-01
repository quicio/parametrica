## MODIFIED Requirements

### Requirement: Projection availability

Orthographic projections SHALL be available when the active generator declares
a spatial capability and the evaluated geometry is `Curve3D`. Two-dimensional
generators SHALL fall back to the camera view and the selector SHALL be
disabled with an explanation.

#### Scenario: 2D generator

- **WHEN** the active generator is Lissajous or another non-spatial family
- **THEN** the projection selector is disabled
- **AND** the canvas keeps rendering the camera view instead of going blank

#### Scenario: Switching from 3D to 2D

- **WHEN** a projected Helix document is replaced by a 2D preset
- **THEN** `view.projection` resets to `3d`

#### Scenario: Export fallback

- **WHEN** an SVG is exported from a 2D document with a stale projected view
- **THEN** the SVG uses the camera geometry

#### Scenario: Spatial generator

- **WHEN** the active generator declares `capabilities.spatial = true`
- **THEN** the projection selector is enabled
- **AND** the view layer consumes world `Curve3D` coordinates

#### Scenario: Orthographic export

- **WHEN** an SVG is exported from an active orthographic view
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
