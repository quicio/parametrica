## ADDED Requirements

### Requirement: Typed operator core

Operator expression helpers and the registration index SHALL be strict
TypeScript.

#### Scenario: Expressions

- **WHEN** optional expressions are compiled or point expressions evaluated
- **THEN** sources, scopes, points and results are typed
- **AND** blank/error behavior is unchanged

#### Scenario: Registration

- **WHEN** the operator index loads
- **THEN** the same operator modules self-register in the same order
- **AND** behavior is unchanged

### Requirement: Operator core compatibility

The old `operators/expression.js` and `operators/index.js` paths SHALL keep
resolving.

#### Scenario: Import

- **WHEN** operators or the app import the old paths
- **THEN** compatibility modules resolve
- **AND** behavior is unchanged
