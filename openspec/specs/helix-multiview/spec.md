# helix-multiview Specification

## Purpose
Provide a quad canvas layout for spatial documents that displays the 3D camera
and the XY, XZ and YZ orthographic projections at once.
## Requirements
### Requirement: Quad layout

Spatial documents SHALL support a persistent `view.layout` of `single` or
`quad`, defaulting to single.

#### Scenario: Switch to quad

- **WHEN** a spatial document selects Quad in Camera
- **THEN** the canvas displays four panels: 3D, XY, XZ, YZ
- **AND** the document layout state is `quad`

#### Scenario: Non-spatial document

- **WHEN** the active generator is 2D
- **THEN** the Layout control is disabled
- **AND** the document remains in single layout

### Requirement: Panel projection and rendering

Each quad panel SHALL use the same document and camera with its own projection.

#### Scenario: Projection content

- **WHEN** quad is active
- **THEN** the 3D panel uses the camera view
- **AND** the other panels use XY, XZ and YZ orthographic projections
- **AND** active passes and per-layer styles render in each panel

#### Scenario: Panel analysis

- **WHEN** a diagnostic pass or overlay needs differential geometry
- **THEN** each panel derives analysis from its own projected curves

### Requirement: Single-mode compatibility

Single layout SHALL remain the default and preserve the existing renderer.

#### Scenario: Existing document

- **WHEN** a document without `view.layout` loads
- **THEN** it renders as single
- **AND** all existing camera, projection and export behavior is unchanged

### Requirement: Export boundary

PNG/GIF SHALL capture the quad composition. SVG and plotter SHALL use the active
projection and disclose that quad is canvas-only.

#### Scenario: SVG in quad

- **WHEN** the user exports SVG while quad is active
- **THEN** the SVG uses the active projection
- **AND** the export notice reports the canvas-only quad layout

