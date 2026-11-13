## Why

The lattice solid builder is the last untyped geometry kernel: it converts the
network into tubes, joints and closure bodies and measures openings.

## What Changes

- Convert `geometry/latticeSolid.js` to `.ts`.
- Convert `geometry/index.js` to `.ts`.
- Type tubes, joint nodes, SDF fallbacks, floors, rims, gauges and stats.
- Keep JS compatibility re-exports.

## Out of Scope

- UI panels and widgets.
