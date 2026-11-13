## ADDED Requirements

### Requirement: Typed resample operators

Resample, subdivide and smooth SHALL be strict TypeScript.

#### Scenario: Apply

- **WHEN** curves are resampled, subdivided or smoothed
- **THEN** curves, params and helper points are typed
- **AND** output points and closed flags are unchanged

### Requirement: Resample compatibility

The old `operators/geometry/resample.js` path SHALL keep resolving.

#### Scenario: Import

- **WHEN** the operator index or tests import the old path
- **THEN** a compatibility re-export resolves
- **AND** behavior is unchanged
