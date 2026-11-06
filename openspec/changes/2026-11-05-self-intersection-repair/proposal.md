## Why

Phase 5B detects self-intersections and Phase 5E repairs orientation, cleanup
and caps, but neither resolves intersecting triangles. Users with folded
meshes still cannot fabricate them. Phase 6A adds an explicit repair strategy
for self-intersections.

## What Changes

- Extend `repairMesh` with `selfIntersections: 'none' | 'split' | 'remesh' | 'auto'`.
- Add local triangle splitting and winding-based fragment classification.
- Add a deterministic signed-distance remesh fallback for tangled meshes.
- Report split/remesh strategy, volume delta, triangle delta and fallbacks.
- Keep self-intersection repair off by default.
- Expose strategy and budgets in Fabricate under Repair.
- Revalidate every result with the 5B self-intersection gate.

## Capabilities

### New Capabilities

- `self-intersection-repair`: split or remesh self-intersecting closed meshes.

### Modified Capabilities

- `advanced-repair`: optional self-intersection resolution inside repair.
- `fabrication-contracts`: repaired self-intersections must revalidate.
- `make-workspace`: strategy controls and report.

## Impact

- `src/geometry/selfIntersectionRepair.js`
- `src/geometry/repair.js`
- Fabricate panel
- Unit/e2e tests and docs

## Non-goals

- No exact topology preservation for remesh mode.
- No direct vertex editing.
- No CSG changes.
- No new dependency.
- No guarantee for arbitrary pathological tangles.
