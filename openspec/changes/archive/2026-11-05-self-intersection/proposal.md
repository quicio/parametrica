## Why

Phase 4 explicitly reported self-intersection validation as unimplemented. A
watertight mesh can still fold through itself, producing a mesh that passes
boundary checks but is unsafe to fabricate. Phase 5 needs a real diagnostic
before CSG and multi-body work.

## What Changes

- Add a deterministic triangle-triangle self-intersection detector.
- Use a bounding-volume hierarchy for broad-phase candidate selection.
- Exclude adjacent triangles that only share a spatial vertex/edge.
- Report checked status, intersecting pair count and a bounded pair list.
- Make self-intersections a validation error for fabrication.
- Show validation errors and the self-intersection result in Fabricate.

## Capabilities

### New Capabilities

- `self-intersection`: deterministic mesh self-intersection diagnostics.

### Modified Capabilities

- `fabrication-contracts`: self-intersections are now checked and rejected.
- `make-workspace`: Fabricate reports validation errors, not only warnings.

## Impact

- `src/geometry/selfIntersection.js`
- `src/geometry/validate.js`
- `src/application/fabricationSource.js`
- Fabricate panel
- Unit/e2e tests and docs

## Non-goals

- No repair or hole filling.
- No CSG or boolean operations.
- No multi-body export.
- No exact geometric predicates beyond a documented tolerance.
