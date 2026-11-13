## ADDED Requirements

### Requirement: Typed topology repeat operators

Duplicate, radial, linear, polar, grid and recursive repeat SHALL be strict
TypeScript.

#### Scenario: Apply

- **WHEN** geometry is duplicated or distributed
- **THEN** curves, params, transforms and ids are typed
- **AND** generated geometry is unchanged

### Requirement: Typed Voronoi and skeleton operators

Voronoi, skeleton and medial axis SHALL be strict TypeScript.

#### Scenario: Apply

- **WHEN** cells or a skeleton are derived from curve samples
- **THEN** samples, triangulation fields, centers and segments are typed
- **AND** generated geometry is unchanged

### Requirement: Topology compatibility

The old `operators/topology/repeat.js` and `voronoi.js` paths SHALL keep
resolving.

#### Scenario: Import

- **WHEN** the operator index or tests import the old paths
- **THEN** compatibility re-exports resolve
- **AND** behavior is unchanged
