## Why

SDF repair, lattice specs and perforation are the fabrication-side geometry
surfaces that still lacked static contracts.

## What Changes

- Convert `geometry/sdfRepair.js` to `.ts`.
- Convert `geometry/latticeSpec.js` to `.ts`.
- Convert `geometry/latticeJointBlend.js` to `.ts`.
- Convert `geometry/perforation.js` to `.ts`.
- Keep JS compatibility re-exports and type the level-set options boundary.

## Out of Scope

- CSG, remesh, solid prep, topology repair and lattice solid kernels.
