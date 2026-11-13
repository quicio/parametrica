## Why

The expression engine and spline math are shared by generators, operators,
mutation and animation; typing them removes the last untyped math core.

## What Changes

- Convert `math/expression.js` to `.ts` with AST and result types.
- Convert `math/noise.js`, `math/stdlib.js` and `math/curves.js` to `.ts`.
- Keep JS compatibility re-exports.

## Out of Scope

- Sampling and period helpers.
