# coordinate-contracts Specification

## Purpose
Make parameter, world and artboard spaces explicit, and make one transform and
one render scene the shared contract for every presentation backend.
## Requirements
### Requirement: Explicit spaces

The engine SHALL declare whether an evaluation is world-space or
artboard-space, and the render scene SHALL declare the space of its input.

#### Scenario: Spatial document

- **WHEN** a spatial generator evaluates
- **THEN** its result declares `space: world`
- **AND** its canonical geometry remains `x,y,z`

#### Scenario: Planar document

- **WHEN** a planar generator evaluates
- **THEN** its result declares `space: artboard`
- **AND** its curves remain in legacy artboard coordinates

### Requirement: Single view transform

Camera, projection and frame SHALL be resolved by one `ViewTransform`
implementation with one effective camera per scene or composition layer.

#### Scenario: Curves and meshes

- **WHEN** a scene contains curves and meshes
- **THEN** both use the same effective camera and frame

#### Scenario: Near plane

- **WHEN** geometry crosses the camera plane
- **THEN** curve clipping and mesh visibility follow the existing near-plane
  contract

### Requirement: Scene frame

`view.frame.mode` SHALL select `scene`, `composition` or `world` framing.

#### Scenario: Scene mode

- **WHEN** multiple spatial layers are visible
- **THEN** they share one frame
- **AND** their relative offsets are preserved

#### Scenario: Composition mode

- **WHEN** composition mode is selected
- **THEN** each visible layer receives its own frame
- **AND** the legacy artistic behavior is preserved

#### Scenario: World mode

- **WHEN** world mode is selected
- **THEN** the frame uses a fixed scale anchored at the world origin

### Requirement: Fit is presentation

Generator mathematics SHALL NOT apply the visual fit.

#### Scenario: Planar generator

- **WHEN** a planar generator samples a shape
- **THEN** post-processing does not scale it to the fit size
- **AND** the engine applies the plane frame once after sampling

#### Scenario: Compatibility

- **WHEN** an existing document contains `generator.params.fit`
- **THEN** the engine consumes it as a frame hint
- **AND** the document loads without migration

### Requirement: Shared framing

Multiple meshes and multiple spatial layers SHALL preserve their relative
positions under one frame.

#### Scenario: Two meshes

- **WHEN** two meshes at different world positions are projected
- **THEN** one frame is applied to both
- **AND** neither mesh is independently centered

### Requirement: Backend parity

Canvas, Quad, SVG and plotter SHALL consume the same artboard-space scene.

#### Scenario: Export

- **WHEN** SVG or plotter output is generated
- **THEN** it uses the scene coordinates without re-projecting or re-fitting

#### Scenario: Quad

- **WHEN** the document is orthographic and Quad is active
- **THEN** the 3D panel is projected from world geometry
- **AND** the other panels use their own projection overrides

#### Scenario: Capture

- **WHEN** PNG or GIF captures the artboard
- **THEN** UI-only guides are not included

### Requirement: Out of scope

Spatial Reference, UV Domain, CAD and physical units SHALL remain out of this
change.

#### Scenario: No new viewport

- **WHEN** the scene is built
- **THEN** no axes, grid, UV inset or fabrication feature is created

