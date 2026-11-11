## ADDED Requirements

### Requirement: Typed 2D generators

Polar, custom, Fourier, noise-field, concentric-ellipses and bilateral-spline
generators SHALL be strict TypeScript.

#### Scenario: Generation

- **WHEN** these generators sample curves or emit multiple curves
- **THEN** params, expressions, harmonics, branches and metadata are typed
- **AND** generated geometry is unchanged

### Requirement: 2D generator compatibility

The old generator `.js` paths SHALL keep resolving.

#### Scenario: Import

- **WHEN** the generator index, presets or tests import the old paths
- **THEN** compatibility re-exports resolve
- **AND** behavior is unchanged
