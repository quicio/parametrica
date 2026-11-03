## ADDED Requirements

### Requirement: Composition inspection

In composition mode, inspection SHALL follow the active layer.

#### Scenario: Independent frames

- **WHEN** composition layers have different transforms
- **THEN** picking does not compare world distances across those layers
- **AND** only the active layer is inspected

#### Scenario: Missing active layer

- **WHEN** composition picking has no active layer id
- **THEN** the result is explicitly empty

### Requirement: Actual Quad state

Inspector Quad messages SHALL use the renderer's actual state.

#### Scenario: Declared Quad with planar active layer

- **WHEN** the document declares Quad but the renderer is single
- **THEN** the inspector does not report single-view-only

### Requirement: Numerical robustness

Triangle picking SHALL support very small valid triangles and positive close
distances.

#### Scenario: Tiny triangle

- **WHEN** a triangle has a very small edge scale
- **THEN** a valid ray hit is not classified as degenerate

#### Scenario: Close hit

- **WHEN** the ray parameter is positive but smaller than the legacy epsilon
- **THEN** the hit is accepted

### Requirement: Malformed mapping

Non-finite UV data SHALL NOT be reported as a valid mapping.

#### Scenario: NaN UV

- **WHEN** a mapping face has a non-finite UV
- **THEN** the result status is `mismatch`
- **AND** UV is null

### Requirement: Viewport lifecycle

Viewport changes SHALL refresh active inspection.

#### Scenario: Resize

- **WHEN** the canvas viewport changes
- **THEN** the active inspector recomputes its last point
