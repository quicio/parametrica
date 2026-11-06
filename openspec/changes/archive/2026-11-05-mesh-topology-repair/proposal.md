## Why

Phase 5E repairs orientation when the topology is orientable and manifold, but
it explicitly leaves non-manifold edges and non-orientable surfaces unresolved.
These meshes still block fabrication with a generic validation error. Phase 6B
adds explicit topology diagnosis and bounded repair.

## What Changes

- Add `repairTopology(mesh, options)` with non-manifold and non-orientable
  strategies.
- Split non-manifold edge fans into separate manifold edges by duplicating
  vertices deterministically.
- Detect non-orientable cycles and cut a seam to produce orientable patches.
- Cap/reject the resulting patch explicitly; never claim a closed solid when
  the topology is not orientable.
- Add topology repair controls and a report in Fabricate.
- Revalidate every result with the standard gate.

## Capabilities

### New Capabilities

- `mesh-topology-repair`: non-manifold splitting and non-orientable handling.

### Modified Capabilities

- `advanced-repair`: topology repair is an explicit repair step.
- `fabrication-contracts`: repaired topology must pass the same gate.
- `make-workspace`: topology controls and report.

## Impact

- `src/geometry/topologyRepair.js`
- `src/geometry/repair.js`
- Fabricate panel
- Unit/e2e tests and docs

## Non-goals

- No exact non-orientable closed embedding (impossible without thickening).
- No self-intersection repair.
- No CSG changes.
- No direct face/vertex editing.
- No new dependency.
