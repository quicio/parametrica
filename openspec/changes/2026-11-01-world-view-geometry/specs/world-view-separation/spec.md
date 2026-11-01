## ADDED Requirements

### Requirement: Generators produce world geometry

Spatial generators SHALL produce true world coordinates and SHALL NOT know the
camera or the render target.

#### Scenario: Helix

- **WHEN** `helix` generates a curve
- **THEN** its points contain world `x/y/z`
- **AND** the generator does not read `view.camera`
- **AND** it does not apply `project3D`

#### Scenario: Parametric 3D

- **WHEN** `parametric-3d` generates a curve
- **THEN** its points contain the evaluated `x(t)/y(t)/z(t)`
- **AND** no screen-space depth is attached by the generator

### Requirement: Camera changes are view-only

Changing camera yaw, pitch or FOV SHALL NOT evaluate generators or operators.

#### Scenario: Orbit

- **WHEN** the user drags in the 3D camera view
- **THEN** the camera state updates
- **AND** the rendered scene is reprojected
- **AND** the generator and operator stages are not re-evaluated

#### Scenario: World metrics

- **WHEN** the camera changes
- **THEN** world bounding box, world arc length and world analysis are
  unchanged

### Requirement: Projection is a view concern

Camera and orthographic projections SHALL consume world geometry and produce
render-space geometry.

#### Scenario: Camera view

- **WHEN** projection is `3d`
- **THEN** the view layer applies the pinhole camera to `Curve3D`
- **AND** depth and depthAlpha are computed in the view layer

#### Scenario: Orthographic view

- **WHEN** projection is `xy`, `xz` or `yz`
- **THEN** the view layer selects the corresponding world axes
- **AND** no generator re-evaluation occurs

### Requirement: Fit is presentation

`fit` and centering SHALL NOT alter canonical world geometry.

#### Scenario: Fit change

- **WHEN** the fit size or artboard changes
- **THEN** the rendered framing changes
- **AND** world geometry and world metrics remain unchanged
