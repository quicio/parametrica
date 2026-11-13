## ADDED Requirements

### Requirement: Typed offset and stroke operators

Offset, inflate, shrink, stroke expansion, ribbon and centerline SHALL be
strict TypeScript.

#### Scenario: Apply

- **WHEN** a polyline is offset or expanded
- **THEN** points, distances, closed flags and outlines are typed
- **AND** generated geometry is unchanged

### Requirement: Typed symmetry operators

Symmetrize, kaleidoscope and optical correction SHALL be strict TypeScript.

#### Scenario: Apply

- **WHEN** curves are folded, mirrored or optically corrected
- **THEN** points, folds, centers and amounts are typed
- **AND** generated geometry is unchanged

### Requirement: Offset family compatibility

The old `operators/geometry/offset.js`, `symmetry.js` and `stroke.js` paths
SHALL keep resolving.

#### Scenario: Import

- **WHEN** the operator index or tests import the old paths
- **THEN** compatibility re-exports resolve
- **AND** behavior is unchanged
