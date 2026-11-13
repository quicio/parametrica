## Why

Robust predicates and self-intersection diagnostics are the numeric base of
validation, repair and CSG. They must stay deterministic and dependency-free.

## What Changes

- Convert `geometry/robustPredicates.js` to `.ts`.
- Convert `geometry/selfIntersection.js` to `.ts`.
- Type points, tolerance inputs, triangles, BVH nodes and intersection pairs.
- Keep JS compatibility re-exports.

## Out of Scope

- Validation, repair and CSG algorithms.
