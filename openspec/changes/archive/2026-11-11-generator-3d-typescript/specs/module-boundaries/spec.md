## ADDED Requirements

### Requirement: Typed spatial generators

Parametric 3D, helix and parametric surface generators SHALL be strict
TypeScript.

#### Scenario: Generation

- **WHEN** 3D curves or surface grids are generated and projected
- **THEN** params, points, domains, seams and projection options are typed
- **AND** geometry is unchanged

### Requirement: Spatial generator compatibility

The old generator `.js` paths SHALL keep resolving.

#### Scenario: Import

- **WHEN** the generator index, presets or tests import the old paths
- **THEN** compatibility re-exports resolve
- **AND** behavior is unchanged
