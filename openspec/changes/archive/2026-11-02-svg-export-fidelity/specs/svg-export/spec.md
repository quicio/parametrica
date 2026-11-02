## Purpose

Export the active vector rendering as one faithful SVG document, including
render passes, overlays and layer blend modes.

## ADDED Requirements

### Requirement: Vector pass fidelity

SVG SHALL reproduce active vector render passes using equivalent SVG
primitives.

#### Scenario: Gradient wireframe

- **WHEN** Gradient Wireframe is active
- **THEN** SVG contains colored line segments derived from `view.colorRamp`
- **AND** the ramp colors match the canvas bucket colors

#### Scenario: Surface passes

- **WHEN** Surface Fill or Surface Wireframe is active with meshes
- **THEN** SVG contains the corresponding polygons or edges
- **AND** painter order and per-face depth alpha are preserved

#### Scenario: Diagnostic passes

- **WHEN** tangents, normals, curvature, topology, epicycles or control polygon
  are active
- **THEN** their lines, circles, paths and text appear in SVG
- **AND** per-layer analysis is used for per-layer passes

### Requirement: Overlays

SVG SHALL render active overlays above the layer groups.

#### Scenario: Overlay primitives

- **WHEN** inflections, sample points, ruler or bbox are active
- **THEN** SVG contains a separate top overlay group
- **AND** its circles, ticks, lines and bbox match the canvas composition

### Requirement: Blend fidelity

SVG SHALL preserve the layer blend mode where the consumer supports CSS
`mix-blend-mode`.

#### Scenario: Blend groups

- **WHEN** a layer uses multiply, screen or difference
- **THEN** its SVG group carries the matching `mix-blend-mode`
- **AND** the root isolates the composition

### Requirement: Explicit raster-only omission

SVG SHALL warn only for active features that cannot be represented as vector
primitives.

#### Scenario: Signed Distance

- **WHEN** Signed Distance is active
- **THEN** the export reports it as a raster-only omission
- **AND** does not silently claim full fidelity
- **AND** PNG remains the faithful raster fallback

### Requirement: Artboard and layer contract

SVG SHALL preserve artboard dimensions, background, layer order and the
embedded Parametrica document comment.

#### Scenario: Layered artboard export

- **WHEN** a multi-layer document is exported
- **THEN** each visible layer is one SVG group in document order
- **AND** hidden layers are omitted
- **AND** the viewBox and background match the artboard
