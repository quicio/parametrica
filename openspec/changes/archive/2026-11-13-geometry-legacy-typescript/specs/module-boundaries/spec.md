## ADDED Requirements

### Requirement: Typed legacy glyph bridge

Legacy Curve[] conversion SHALL be strict TypeScript.

#### Scenario: Convert

- **WHEN** legacy curves are imported or exported
- **THEN** legacy points, spatial flags and projected points are typed
- **AND** generated curves are unchanged

### Requirement: Typed spline classes

Catmull-Rom, master spline, mirror and optical correction SHALL be strict
TypeScript.

#### Scenario: Build glyph

- **WHEN** a glyph is built from controls and mirrored
- **THEN** control points, segments, samples and metrics are typed
- **AND** geometry and metrics are unchanged

### Requirement: Legacy compatibility

The old `geometry/legacy.js` and `geometry/legacy/*.js` paths SHALL keep
resolving.

#### Scenario: Import

- **WHEN** modules import the old paths
- **THEN** compatibility re-exports resolve
- **AND** behavior is unchanged
