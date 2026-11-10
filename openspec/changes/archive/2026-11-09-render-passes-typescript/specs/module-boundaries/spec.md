## ADDED Requirements

### Requirement: Typed render passes

The registered render passes SHALL be strict TypeScript.

#### Scenario: Pass registration

- **WHEN** a pass registers itself
- **THEN** its `appliesTo` and `draw` inputs are typed
- **AND** registration order is unchanged

#### Scenario: Curve passes

- **WHEN** stroke, points, wireframe, gradient, tangent, normal, curvature,
  topology or epicycle passes draw
- **THEN** curves, points, styles, analysis and context calls are typed
- **AND** canvas and SVG output are unchanged

#### Scenario: Surface passes

- **WHEN** surface wireframe, fill or lattice preview draws
- **THEN** meshes, faces, depth and fills are typed
- **AND** painter order and preview output are unchanged

### Requirement: Pass compatibility

The old `render/passes/*.js` paths SHALL keep resolving.

#### Scenario: Import

- **WHEN** the pass index or tests import the old paths
- **THEN** compatibility re-exports resolve
- **AND** behavior is unchanged
