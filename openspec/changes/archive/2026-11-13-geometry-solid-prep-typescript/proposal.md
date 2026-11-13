## Why

Solid preparation is the fabrication front door: it welds, caps and validates
meshes without touching render geometry. Its reports drive user-facing prep
stats.

## What Changes

- Convert `geometry/solidPrep.js` to `.ts`.
- Type usable-mesh guards, preparation stats and result records.
- Keep the JS compatibility re-export and adjust the fabrication cast.

## Out of Scope

- Repair, topology repair, CSG, remesh and lattice solids.
