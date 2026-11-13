## ADDED Requirements

### Requirement: Typed CSG booleans

BSP constructive solid geometry SHALL be strict TypeScript.

#### Scenario: Boolean

- **WHEN** validated solids are combined
- **THEN** operands, planes, polygons, budgets, stats and results are typed
- **AND** boolean output and fallbacks are unchanged

### Requirement: Typed T-junction repair

T-junction insertion and face deduplication SHALL be strict TypeScript.

#### Scenario: Repair

- **WHEN** BSP output contains T-junctions
- **THEN** vertex grids, inserted splits and faces are typed
- **AND** repaired topology is unchanged

### Requirement: CSG compatibility

The old `geometry/csg.js` path SHALL keep resolving.

#### Scenario: Import

- **WHEN** modules import the old path
- **THEN** a compatibility re-export resolves
- **AND** behavior is unchanged
