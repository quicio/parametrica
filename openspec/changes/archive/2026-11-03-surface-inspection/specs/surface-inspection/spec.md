## Purpose

Let users inspect the parametric surface under the cursor in single Canvas and
read its identity, cell, UV, XYZ and depth without changing geometry.

## ADDED Requirements

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
