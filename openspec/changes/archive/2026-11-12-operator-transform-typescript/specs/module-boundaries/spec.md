## ADDED Requirements

### Requirement: Typed transform operators

Translate, mirror, rotate, scale and normalize SHALL be strict TypeScript.

#### Scenario: Apply

- **WHEN** transform operators map geometry points
- **THEN** params, points, scopes and counts are typed
- **AND** transformed geometry is unchanged

### Requirement: Transform compatibility

The old `operators/geometry/transform.js` path SHALL keep resolving.

#### Scenario: Import

- **WHEN** the operator index or tests import the old path
- **THEN** a compatibility re-export resolves
- **AND** behavior is unchanged
