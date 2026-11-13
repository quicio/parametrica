## ADDED Requirements

### Requirement: Typed Manifold adapter

Manifold loading, booleans, simplify and level sets SHALL be strict TypeScript.

#### Scenario: Boolean

- **WHEN** operands are combined through Manifold
- **THEN** module, meshes, validations, stats and failures are typed
- **AND** boolean output and repair fallbacks are unchanged

#### Scenario: Level set

- **WHEN** an SDF is reconstructed
- **THEN** bounds, tolerance, edge length and results are typed
- **AND** level-set output is unchanged

### Requirement: Manifold adapter compatibility

The old `geometry/manifoldEngine.js` path SHALL keep resolving.

#### Scenario: Import

- **WHEN** modules import the old path
- **THEN** a compatibility re-export resolves
- **AND** behavior is unchanged
