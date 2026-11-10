## ADDED Requirements

### Requirement: Typed view pipeline

The world/view/artboard transform, projection and viewport-coordinate helpers
SHALL be strict TypeScript.

#### Scenario: Transform

- **WHEN** a view transform maps world points to artboard or device space
- **THEN** frames, bounds, projected points and the transform are typed
- **AND** framing output is unchanged

#### Scenario: Projection

- **WHEN** world curves and meshes are projected in 3D or orthographic views
- **THEN** curves, meshes, options, camera and projected points are typed
- **AND** splitting, depth and axis behavior are unchanged

#### Scenario: Viewport coordinates

- **WHEN** panel descriptors, world readouts, ranges, ticks or quad panels are built
- **THEN** axes, units, ranges, ticks and layout are typed
- **AND** displayed coordinates are unchanged

### Requirement: View pipeline compatibility

The old `view/transform.js`, `view/projection.js` and
`view/viewportCoordinates.js` paths SHALL keep resolving.

#### Scenario: Import

- **WHEN** engine, scene builder, renderer, picking, export or tests import the
  old paths
- **THEN** compatibility re-exports resolve
- **AND** behavior is unchanged
