## Why

Manifold is now the primary CSG engine but requires manifold input. Remesh was
the only self-intersection fallback and is approximate. Manifold.levelSet can
build a guaranteed manifold iso-surface from an SDF, so the missing piece is a
trustworthy SDF.

## What Changes

- Add a winding-sign SDF from the source mesh BVH.
- Add `Manifold.levelSet` to the engine adapter.
- Prefer SDF repair in `auto`; keep remesh as fallback.
- Use multi-ray winding instead of parity so overlapping shells stay inside.
- Validate the level-set result and record Manifold's manifold guarantee.
- Expose SDF/remesh strategies in Fabricate with a resolution control.
- Document the trust boundary for the local self-intersection check.

## Capabilities

### New Capabilities

- `sdf-intersection-repair`: winding SDF + Manifold levelSet.

### Modified Capabilities

- `self-intersection-repair`: SDF is primary; remesh is fallback.
- `self-intersection`: Manifold-guaranteed outputs may record the local check as
  guaranteed.
- `manifold-engine`: levelSet adapter.
- `fabrication-contracts`: SDF output validation.
- `make-workspace`: strategy and resolution controls.

## Impact

- `src/geometry/sdfRepair.js`
- `src/geometry/manifoldEngine.js`
- `src/geometry/remesh.js`
- `src/geometry/selfIntersectionRepair.js`
- Document/UI/tests/docs

## Non-goals

- No exact topology-preserving split.
- No feature-edge constrained level set.
- No CSG change.
- No new dependency.
