# Local SDF joint spike

**Date:** 2026-11-07
**Module:** `src/geometry/latticeJointBlend.js`
**Script:** `scripts/bench-joint-blend.mjs`
**Status:** timeboxed candidate; not the production default.

## Method

A synthetic four-branch junction is built from four capsules around a common
node. The SDF is a smooth-min of the capsule distances and is meshed with
`Manifold.levelSet`. The benchmark varies the level-set edge length.

| Edge length | Result | Triangles | Build time | Manifold |
|---:|---|---:|---:|---|
| 0.70 mm | ok | 264 | 13 ms | yes |
| 0.50 mm | ok | 484 | 9 ms | yes |
| 0.35 mm | ok | 1,132 | 18 ms | yes |

## Decision

- Local SDF + `Manifold.levelSet` is feasible for a single junction.
- It is **not** promoted to the default joint path. The full-preset benchmark,
  opening-preservation check and multi-node budget are still pending.
- Production continues to use `rounded`; a requested `blend` falls back to
  `rounded` and is reported.
- The synthetic benchmark is not a full lattice benchmark: it does not measure
  hundreds of joints, tube unions, opening preservation or export cost.

## Next gate

Run the same comparison on `Lattice Vase 200` and `Organic Lattice Vase 200`
with a budgeted number of SDF joints, then compare triangles, build time,
manifold validity and opening gauge against `rounded`.
