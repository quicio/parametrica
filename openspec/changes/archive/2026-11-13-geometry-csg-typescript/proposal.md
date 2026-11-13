## Why

CSG is the core fabrication boolean engine: it validates operands, runs BSP or
Manifold strategies and repairs T-junctions.

## What Changes

- Convert `geometry/csg.js` to `.ts`.
- Type planes, polygons, BSP nodes, budgets and boolean results.
- Type T-junction repair and face deduplication.
- Keep the JS compatibility re-export.

## Out of Scope

- Remesh internals, lattice solids and UI.
