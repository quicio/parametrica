## Why

Composed repair is the fabrication action users trigger when a mesh is not
watertight or self-intersects; its reports are user-visible.

## What Changes

- Convert `geometry/repair.js` to `.ts`.
- Convert `geometry/selfIntersectionRepair.js` to `.ts`.
- Type repair reports, edge maps, shells, caps and self-intersection reports.
- Keep JS compatibility re-exports and point the architecture check at the
  `.ts` module.

## Out of Scope

- CSG, remesh internals, manifold engine and lattice solids.
