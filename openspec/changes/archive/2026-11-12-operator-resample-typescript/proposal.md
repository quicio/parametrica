## Why

Resample, subdivide and smooth are the sampling operators shared by every
geometry pipeline; they are the last untyped core operators before the 3D
families.

## What Changes

- Convert `operators/geometry/resample.js` to `.ts`.
- Type curve-like inputs, params and the midpoint/chaikin/laplacian helpers.
- Keep the JS compatibility export.

## Out of Scope

- The remaining geometry/topology operator bodies.
