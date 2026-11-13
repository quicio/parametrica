## ADDED Requirements

### Requirement: Typed deform and expression operators

Twist, bend, warp, displace, noise displace and expression clip SHALL be strict
TypeScript.

#### Scenario: Apply

- **WHEN** curves are deformed or clipped by expressions
- **THEN** points, scopes, compiled expressions and runs are typed
- **AND** generated geometry is unchanged

### Requirement: Typed projection and boolean operators

Project, clip and boolean SHALL be strict TypeScript.

#### Scenario: Apply

- **WHEN** curves are projected, clipped to a window or combined
- **THEN** targets, window predicates, rings and results are typed
- **AND** generated geometry is unchanged

### Requirement: Deform family compatibility

The old `operators/geometry/deform.js`, `project.js`, `expressionClip.js` and
`boolean.js` paths SHALL keep resolving.

#### Scenario: Import

- **WHEN** the operator index or tests import the old paths
- **THEN** compatibility re-exports resolve
- **AND** behavior is unchanged
