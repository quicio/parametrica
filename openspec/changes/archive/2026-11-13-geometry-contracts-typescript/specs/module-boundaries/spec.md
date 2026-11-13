## ADDED Requirements

### Requirement: Typed geometry contracts

Canonical geometry kinds SHALL be strict TypeScript with exported point,
curve, surface, mesh and solid interfaces.

#### Scenario: Factory and predicates

- **WHEN** geometry is created or narrowed by kind
- **THEN** factories return typed geometry and predicates narrow the value
- **AND** emitted fields and defaults are unchanged

### Requirement: Typed geometry helpers

Trust metadata, kind conversions, world transforms and point mapping SHALL be
strict TypeScript.

#### Scenario: Mapping

- **WHEN** geometry is lifted, converted or mapped
- **THEN** points, transforms and results are typed
- **AND** geometry output is unchanged

### Requirement: Geometry contract compatibility

The old `geometry/contracts.js`, `trust.js`, `relations.js`, `transform.js` and
`transformGeometry.js` paths SHALL keep resolving.

#### Scenario: Import

- **WHEN** modules import the old paths
- **THEN** compatibility re-exports resolve
- **AND** behavior is unchanged
