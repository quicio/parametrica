## Why

Topology repair splits non-manifold fans and cuts orientation cycles; its
report feeds the repair pipeline and user-facing prep errors.

## What Changes

- Convert `geometry/topologyRepair.js` to `.ts`.
- Type edge maps, fans, orientation conflicts and reports.
- Keep the JS compatibility re-export.

## Out of Scope

- Repair composition, CSG, remesh and lattice solids.
