## ADDED Requirements

### Requirement: Typed lattice solid

Lattice strut, joint, floor, rim and opening logic SHALL be strict TypeScript.

#### Scenario: Build

- **WHEN** a lattice network is converted into one solid
- **THEN** curves, tubes, joints, closures, gauges and stats are typed
- **AND** solid geometry and fallbacks are unchanged

### Requirement: Typed geometry barrel

The geometry barrel SHALL re-export typed modules only.

#### Scenario: Import

- **WHEN** geometry modules are imported through the barrel
- **THEN** it resolves to the typed modules
- **AND** exported names are unchanged

### Requirement: Geometry compatibility

The old `geometry/latticeSolid.js` and `geometry/index.js` paths SHALL keep
resolving.

#### Scenario: Import

- **WHEN** modules import the old paths
- **THEN** compatibility re-exports resolve
- **AND** behavior is unchanged
