## Why

Remeshing is the deterministic fallback for CSG, self-intersection repair and
SDF reconstruction; its BVH and inside tests are shared by several modules.

## What Changes

- Convert `geometry/remesh.js` to `.ts`.
- Type grids, marching tetrahedra, projection, BVH nodes and inside/winding
  queries.
- Keep the JS compatibility re-export and align SDF repair with the typed BVH.

## Out of Scope

- Lattice solids and UI.
