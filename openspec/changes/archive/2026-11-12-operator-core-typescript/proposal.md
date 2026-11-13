## Why

Operator bodies share optional expression helpers and a self-registration
index. Typing the core is the first step of the operator block.

## What Changes

- Convert `operators/expression.js` to `.ts`.
- Convert `operators/index.js` to `.ts` with a side-effect compatibility shim.
- Type optional expression compilation, scopes and point evaluation.
- Keep the JS compatibility exports.

## Out of Scope

- The 11 operator implementations (geometry/topology).
