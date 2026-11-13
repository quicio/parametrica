## Why

The topology operators close the operator block: arrays multiply geometry and
Voronoi/skeleton approximate structure from curve samples.

## What Changes

- Convert `operators/topology/repeat.js` to `.ts`.
- Convert `operators/topology/voronoi.js` to `.ts`.
- Add a local `d3-delaunay` declaration for the triangulation contract.
- Keep the JS compatibility exports.

## Out of Scope

- Geometry kernels and UI modules.
