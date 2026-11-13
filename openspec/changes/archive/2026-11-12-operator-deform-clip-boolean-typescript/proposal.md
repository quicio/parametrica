## Why

Deform, projection, clipping and boolean operators are the last untyped 2D
families; boolean is the only operator with a typed third-party geometry
dependency.

## What Changes

- Convert `operators/geometry/deform.js` to `.ts`.
- Convert `operators/geometry/project.js` to `.ts`.
- Convert `operators/geometry/expressionClip.js` to `.ts`.
- Convert `operators/geometry/boolean.js` to `.ts` with polygon-clipping types.
- Keep the JS compatibility exports.

## Out of Scope

- Topology repeat/voronoi and 3D operators.
