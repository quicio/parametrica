# surface-inspection Specification

## Purpose
Let users inspect the parametric surface under the cursor in single Canvas and
read its identity, cell, UV, XYZ and depth without changing geometry.
## Requirements
### Requirement: Cursor and ray

The system SHALL convert canvas coordinates through artboard space into a
world ray using the scene transform.

#### Scenario: Perspective

- **WHEN** the camera projection is active
- **THEN** the ray starts at the camera eye and follows the cursor direction

#### Scenario: Orthographic

- **WHEN** XY, XZ or YZ is active
- **THEN** the ray is parallel to the panel eye and varies with cursor position

### Requirement: World intersection

Picking SHALL intersect canonical world triangles.

#### Scenario: Slanted surface

- **WHEN** a triangle has variable depth
- **THEN** the ray intersection returns the correct world point

#### Scenario: Degenerate triangle

- **WHEN** a triangle has zero area
- **THEN** it is ignored

### Requirement: Occlusion

The nearest world intersection SHALL win across visible surface meshes.

#### Scenario: Overlapping surfaces

- **WHEN** multiple surfaces overlap under the cursor
- **THEN** the closest world hit is selected
- **AND** mesh iteration or painter order does not decide the winner

### Requirement: UV resolution

UVs SHALL come from SurfaceMapping per-corner data and world barycentrics.

#### Scenario: Seam

- **WHEN** the hit triangle crosses a seam or twist
- **THEN** UVs use the real corner values

#### Scenario: Missing mapping

- **WHEN** the hit mesh has no valid mapping
- **THEN** the result reports the missing/mismatch status
- **AND** no UV is invented

### Requirement: XYZ and perspective consistency

World XYZ and UV SHALL be consistent with the ray intersection.

#### Scenario: Perspective

- **WHEN** the triangle is slanted in perspective
- **THEN** UV interpolation follows the world barycentric coordinates

### Requirement: Inspector UI

A compact inspector SHALL show surface, triangle, cell, UV, XYZ and depth.

#### Scenario: Hover

- **WHEN** the cursor is over a surface
- **THEN** the inspector updates
- **AND** no geometry changes

#### Scenario: No hit

- **WHEN** the cursor is over empty space
- **THEN** the inspector reports no surface

#### Scenario: Quad

- **WHEN** Quad is active
- **THEN** the inspector reports single-view-only

### Requirement: Isolation

Inspection SHALL NOT alter render, frame, bbox, geometry, captures or exports.

#### Scenario: Export

- **WHEN** SVG or plotter output is generated
- **THEN** it contains no inspection data

### Requirement: Out of scope

Quad picking, editing, CAD, z-buffer and inspection export SHALL remain out of
scope.

#### Scenario: No editing

- **WHEN** a surface is inspected
- **THEN** no vertex, UV or geometry mutation occurs

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

### Requirement: Inspection overlay

Single Canvas SHALL show UI-only marker, triangle and cell highlights.

#### Scenario: Valid mapping

- **WHEN** a pick has a valid mapping
- **THEN** a marker, the selected triangle and the four-corner cell are drawn

#### Scenario: Missing mapping

- **WHEN** a pick has no mapping
- **THEN** the marker and triangle are drawn with an invalid style
- **AND** no cell is invented

### Requirement: Pin lifecycle

The inspector SHALL allow pinning and releasing a pick independently of hover.

#### Scenario: Pin

- **WHEN** the user pins a valid pick
- **THEN** hover no longer replaces the displayed result

#### Scenario: Release

- **WHEN** the user releases the pin
- **THEN** the current hover result is restored or a hover prompt appears

#### Scenario: Invalidated pin

- **WHEN** geometry, topology, active layer, projection, camera, frame, artboard
  or playback changes invalidate the pinned result
- **THEN** the pin is released
- **AND** no stale pick is displayed

### Requirement: Overlay isolation

Inspection overlays SHALL NOT enter RenderScene, exports or captures.

#### Scenario: Export

- **WHEN** SVG, plotter, PNG or GIF output is generated
- **THEN** inspection overlays are absent

### Requirement: Single view

Overlays SHALL remain single-Canvas only.

#### Scenario: Quad

- **WHEN** Quad is active
- **THEN** no inspection overlay is drawn
- **AND** the inspector reports single-view-only

