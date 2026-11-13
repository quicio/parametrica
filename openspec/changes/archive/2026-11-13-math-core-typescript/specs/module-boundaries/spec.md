## ADDED Requirements

### Requirement: Typed expression engine

Tokenization, parsing and evaluation SHALL be strict TypeScript.

#### Scenario: Compile

- **WHEN** user equations are compiled and evaluated
- **THEN** tokens, AST nodes, scopes, results and span errors are typed
- **AND** precedence, associativity and errors are unchanged

### Requirement: Typed math library

Noise, stdlib and spline math SHALL be strict TypeScript.

#### Scenario: Evaluate

- **WHEN** noise, stdlib functions or splines are used
- **THEN** seeds, functions, segments and points are typed
- **AND** numeric output is unchanged

### Requirement: Math compatibility

The old `math/expression.js`, `noise.js`, `stdlib.js` and `curves.js` paths
SHALL keep resolving.

#### Scenario: Import

- **WHEN** modules import the old paths
- **THEN** compatibility re-exports resolve
- **AND** behavior is unchanged
