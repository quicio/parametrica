# operator-spaces Specification

## Purpose
TBD - created by archiving change 2026-11-01-world-view-geometry. Update Purpose after archive.
## Requirements
### Requirement: Operators declare geometry and space

Every operator SHALL declare `accepts`, `produces` and `space`.

#### Scenario: 2D operator

- **WHEN** a 2D operator declares `accepts: ['curve2d']` and `space: 'world'`
- **THEN** it only runs on Curve2D geometry

#### Scenario: Incompatible input

- **WHEN** an operator receives a geometry kind it does not accept
- **THEN** the pipeline returns a keyed type error
- **AND** no partial mutation is committed

### Requirement: 3D transforms update world coordinates

Operators that transform Curve3D SHALL update the canonical `x/y/z` world
coordinates.

#### Scenario: Rotate Curve3D

- **WHEN** a Curve3D passes through a world rotate operator
- **THEN** every point is transformed in world space
- **AND** no stale `x3/y3/h3` metadata remains

#### Scenario: Orthographic consistency

- **WHEN** a transformed Curve3D is rendered in `xy`, `xz` or `yz`
- **THEN** the projected result reflects the same transformation
- **AND** camera and orthographic views do not disagree because of metadata

### Requirement: Legacy view-space compatibility

Legacy 2D operators applied to Curve3D SHALL run in an explicit view-compatibility
lane until their world-space replacements exist. Their space is declared by
the operator definition or by a versioned compatibility classification; it is
never inferred by mutating geometry at runtime.

#### Scenario: Existing 3D document

- **WHEN** a document created before this change applies a legacy screen-space
  operator to a 3D curve
- **THEN** the visual result is preserved in the camera view
- **AND** the operator is not silently reported as a world-space transform
- **AND** canonical `Curve3D` world coordinates are not modified

#### Scenario: View-space result representation

- **WHEN** a view-space operator is applied
- **THEN** its result is a view-space geometry/render item carrying its
  declared `space: 'view'`
- **AND** the result is associated with the source world-geometry identity
- **AND** it is stored only in the view projection/render cache layers
- **AND** it is never persisted, used for world analysis, or used to compute
  world descriptors

#### Scenario: Projection switch with a legacy operator

- **WHEN** a legacy 2D operator has been applied to Curve3D and the user
  switches between `3d`, `xy`, `xz` and `yz`
- **THEN** the operator's declared view-space semantics are preserved
- **AND** it does not become a world-space operator implicitly
- **AND** canonical world geometry remains byte-equivalent
- **AND** the view result is recomputed for the new projection
- **AND** world, projection and render caches remain separate

#### Scenario: New world operators

- **WHEN** a world-space operator is added
- **THEN** it runs in the world lane before projection
- **AND** it cannot mutate projected render coordinates directly

#### Scenario: Mixed operator stack

- **WHEN** a document contains both world-space and view-space operators
- **THEN** world-space operators execute in document order before projection
- **AND** view-space operators execute in document order after projection
- **AND** the view-space result records which world result it derives from

#### Scenario: Invalid space assignment

- **WHEN** an operator cannot act in its declared space for the received
  geometry kind
- **THEN** evaluation reports a keyed operator error
- **AND** no world or view geometry is partially mutated

