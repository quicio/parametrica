## Why

Surface analysis, tessellation and wireframes form the read-only path from a
Surface to renderable meshes and mapping sidecars.

## What Changes

- Convert `geometry/analysis.js` to `.ts`.
- Convert `geometry/uvDomain.js` to `.ts`.
- Convert `geometry/surfaceTessellation.js` to `.ts`.
- Convert `geometry/wireframe.js` to `.ts`.
- Keep JS compatibility re-exports and adjust render scene casts.

## Out of Scope

- Repair, CSG, remesh and lattice kernels.
