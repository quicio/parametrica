## ADDED Requirements

### Requirement: Projection availability

Orthographic projections SHALL only be selectable for documents whose geometry
carries true 3D coordinates. Two-dimensional generators SHALL fall back to the
camera view and the selector SHALL be disabled with an explanation.

#### Scenario: 2D generator

- **WHEN** the active generator is Lissajous or another 2D family
- **THEN** the projection selector is disabled
- **AND** the canvas keeps rendering the camera view instead of going blank

#### Scenario: Switching from 3D to 2D

- **WHEN** a projected Helix document is replaced by a 2D preset
- **THEN** `view.projection` resets to `3d`

#### Scenario: Export fallback

- **WHEN** an SVG is exported from a 2D document with a stale projected view
- **THEN** the SVG uses the camera geometry
