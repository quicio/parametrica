## Context

Verified baseline:

- `src/geometry/latticeSolid.js` resolves `finishQuality` into fixed
  `radialSegments`, `curveSamples` and `jointSlices`; it does not measure
  chord or surface deviation.
- Organic centerlines already interpolate in `(θ,z)` and unwrap the seam.
  Polyline is the explicit fallback when no surface profile is available.
- `src/geometry/latticeNetwork.js` exposes cells, opening polygons, opening
  centers and a network hash.
- `measureOpeningClearance` in `latticeSolid.js` estimates free width from a
  point-to-triangle distance. It is not a capsule test.
- `src/sampling/sampling.js` already has deterministic chord-error refinement
  for view sampling, but it is not reused by the lattice surface builder.
- `finishQuality` is separate from the repair/SDF `quality` field and already
  travels through preparation, worker, report and export.
- The solid result records `specHash`, `networkHash`, `algorithmVersion`,
  `finishQuality`, `curveStyle`, `jointStyle` and `openingGauge`.

## Refinement contract

```text
RefinementSpec {
  version: 1
  frame: 'surface'
  method: 'chord-deviation'
  tolerance: number             // mm, provisional 0.1
  minSamplesPerEdge: number
  maxSamplesPerEdge: number
  preserveTopology: true
  openingValidation: 'capsule' | 'estimate'
  budget: {
    maxPoints: number
    maxTriangles: number
    maxBuildMs: number
  }
}
```

`RefinementSpec` is **derived** from the finish profile and the lattice
configuration. It is not a new document object. `LatticeSolidResult.provenance`
records the resolved spec hash and the measured maxima.

## Adaptive sampling

For each edge:

1. Interpolate in surface coordinates `(θ,z)`.
2. Start from the authored samples, not from an arbitrary global grid.
3. Split the segment with the largest deviation first.
4. Respect `minSamplesPerEdge`, `maxSamplesPerEdge` and the global point
   budget.
5. Deterministic tie-break: larger error first, then lower segment index.
6. Insert samples only. Endpoints, node identity, edge identity and cell
   topology stay unchanged.
7. Measure chord deviation against the curved centerline and surface
   deviation against `R(z)`; report both maxima.

The refinement never uses random jitter. Changing only the finish profile may
change sample count, but it must not change the network hash.

## Surface adherence

- Refinement runs in surface coordinates, so the sample is mapped back through
  the same profile used by the network.
- If the profile function is unavailable, the builder must use polyline and
  report `curveFallback: true`; it must not pretend the curve is organic.
- When a 3D fallback is used, the maximum distance to the intended surface is
  reported as `surfaceDeviation`. A value above the tolerance is a warning,
  not a silent success.

## Opening preservation

- Refinement is topology-preserving: no node, edge or cell is added or removed
  to satisfy quality. If the opening is too small, report it; do not silently
  merge cells at this stage.
- The preferred check is a capsule of diameter `minOpeningWidth` through the
  opening center, oriented by the local surface normal, intersected with the
  final solid. The capsule length must span the wall plus a margin.
- The current point-clearance estimate may remain as a cheaper `estimate`
  mode, but its report must say `estimate`, not `measured`.
- `draft` may validate a deterministic subset of interior cells; `standard`
  and `high` validate every interior opening. The report always states how
  many cells were checked and how many were skipped.

## Quality budgets

| Profile | Curve samples | Radial segments | Joint slices | Gauge | Budget status |
|---|---:|---:|---:|---|---|
| `draft` | adaptive, low cap | 8 | 8 | subset | provisional |
| `standard` | adaptive, medium cap | 10 | 12 | all interior | provisional |
| `high` | adaptive, high cap | 16 | 16 | all interior + capsule | provisional |

The numbers are starting points, not guarantees. The benchmark must measure
points, triangles, build time, gauge time and maximum deviation on
`Lattice Vase 200` and `Organic Lattice Vase 200` at 15/20/25 mm before any
budget becomes a CI gate.

## Joint decision gate

The local SDF joint (`Manifold.levelSet`) remains a candidate. It may become a
default only if the benchmark demonstrates all of the following:

- closed, manifold, oriented and positive volume;
- no opening below the target after the gauge;
- deterministic output for the same spec/quality;
- an acceptable point/triangle/time budget;
- a measurable visual improvement over `rounded`.

If any criterion fails, `rounded` remains the production path and the report
records the fallback reason. This proposal does not make SDF the default.

## Acceptance classification

**Functional guarantees**

- Same spec, algorithm version, finish quality and refinement spec produce the
  same mesh hash.
- Refinement inserts samples only; topology and network identity do not change.
- Surface deviation and chord deviation are reported.
- The opening report distinguishes `measured` (capsule) from `estimate`.
- The worker receives the resolved profile; no silent upgrade.

**Quality objectives (provisional)**

- Maximum chord deviation below the configured tolerance.
- Maximum surface deviation below the configured tolerance.
- Interior openings pass the gauge in at least the measured baseline
  percentage; exceptions are reported.
- No regression in the three existing vase presets.

**Pending benchmarks**

- 15/20/25 mm points, triangles, time and memory.
- Capsule gauge cost.
- SDF versus rounded visual/quality/cost.
- Golden screenshot stability.

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Adaptive split creates long thin tubes | Medium | Cap segment ratio and min sample spacing |
| Capsule gauge is too expensive | High | Budgeted subset in draft; cache by cell id |
| Refinement changes topology accidentally | High | Only insert samples; tests assert ids and cell count |
| SDF joint closes openings | High | Gauge; fallback to rounded; reported |
| Budget gate rejects real presets | Medium | Measure first; keep thresholds provisional |
| Screenshot noise causes false regressions | Medium | Use scene geometry or tolerance; document manual review |
