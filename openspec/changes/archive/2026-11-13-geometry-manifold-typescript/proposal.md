## Why

The Manifold adapter is the guaranteed-manifold gateway for fabrication. Typed
module loading, mesh conversion and failure records keep the boundary honest.

## What Changes

- Convert `geometry/manifoldEngine.js` to `.ts`.
- Use the manifold-3d types for module, Manifold, Mesh, Vec3 and options.
- Type boolean/simplify/level-set results, stats and failures.
- Keep the JS compatibility re-export.

## Out of Scope

- CSG composition, remesh internals and lattice solids.
