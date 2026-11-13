## ADDED Requirements

### Requirement: Typed geometry validation

Curve, surface, mesh and solid validation SHALL be strict TypeScript.

#### Scenario: Validate

- **WHEN** geometry is validated
- **THEN** inputs, errors, warnings and metadata are typed
- **AND** checks and messages are unchanged

### Requirement: Typed printability checks

The heuristic printability summary SHALL be strict TypeScript.

#### Scenario: Printability

- **WHEN** overhang, bed contact and lattice limits are measured
- **THEN** options, areas, warnings and lattice fields are typed
- **AND** thresholds and reported values are unchanged

### Requirement: Validation compatibility

The old `geometry/validate.js` and `printChecks.js` paths SHALL keep
resolving.

#### Scenario: Import

- **WHEN** modules import the old paths
- **THEN** compatibility re-exports resolve
- **AND** behavior is unchanged
