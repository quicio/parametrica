## ADDED Requirements

### Requirement: Typed trochoids and splines

Trochoid, spirograph, Catmull-Rom, Bézier and cubic-spline generators SHALL be
strict TypeScript.

#### Scenario: Generation

- **WHEN** trochoid or spline families generate curves
- **THEN** params, turns, nodes, segments and sample options are typed
- **AND** geometry is unchanged

### Requirement: Trochoid/spline compatibility

The old `generators/trochoids.js` and `generators/splines.js` paths SHALL keep
resolving.

#### Scenario: Import

- **WHEN** the generator index, presets or tests import the old paths
- **THEN** compatibility re-exports resolve
- **AND** behavior is unchanged
