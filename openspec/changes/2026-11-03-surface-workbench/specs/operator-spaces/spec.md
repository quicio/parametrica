## ADDED Requirements

### Requirement: Spatial geometry operators

Operators SHALL be able to declare acceptance of Surface, Mesh and Solid
geometry in world space.

#### Scenario: Surface transform

- **WHEN** a world transform declares `accepts: ['surface']`
- **THEN** it can transform a Surface before tessellation
- **AND** every point keeps finite world coordinates

#### Scenario: Unsupported kind

- **WHEN** a spatial operator receives a geometry kind it does not accept
- **THEN** evaluation reports a keyed operator error
- **AND** no partial geometry is committed

#### Scenario: Curve compatibility

- **WHEN** an existing curve operator stack evaluates a curve document
- **THEN** its order, semantics and output remain unchanged

### Requirement: Spatial operator semantics

Spatial operators SHALL operate on canonical world geometry, not projected
render coordinates.

#### Scenario: Camera independent transform

- **WHEN** a Surface is transformed by a world operator
- **THEN** its canonical world vertices change
- **AND** camera yaw/pitch/fov do not affect the result
