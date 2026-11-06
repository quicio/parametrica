## Why

The organic lattice now produces closed solids with surface curves, variable
radius and rounded joints, but the result is still **fixed-resolution** per
finish profile. The builder does not measure chord deviation, does not report
surface adherence, samples every segment with the same count and does not have
a benchmark that ties `draft` / `standard` / `high` to a deviation, triangle or
time budget.

The opening gauge is a useful first check, but it is a point-clearance proxy,
not the capsule-through-opening test described in the architecture. The local
SDF joint remains an unvalidated candidate. Without a refinement contract,
those are unmeasured quality claims.

## What Changes

- Add a derived `RefinementSpec` for surface-coordinate adaptive sampling.
- Refine each centerline by deterministic chord/surface deviation, not by a
  fixed sample count per segment.
- Report maximum surface deviation; fall back to polyline when the surface
  profile is unavailable.
- Preserve topology and openings: refinement only inserts samples, never moves
  nodes, edges or cells.
- Upgrade the opening validation from point clearance to an explicit capsule
  gauge when the budget allows; otherwise keep it labelled as an estimate.
- Add measured budgets per finish profile: points, triangles, build time and
  maximum deviation. Values remain provisional until benchmarked.
- Add a benchmark harness for 15/20/25 mm and golden visual review for
  `Lattice Vase 200` and `Organic Lattice Vase 200`.
- Keep the local SDF joint as a benchmark candidate. `rounded` remains the
  default fallback until the decision gate passes.
- Include refinement provenance in the solid result and in Fabricate.

## Out of Scope

- No new renderer, PBR or material system.
- No global SDF reconstruction of the lattice.
- No general Surface/UV lattice; this phase stays on surfaces of revolution.
- No geodesic Voronoi.
- No slicer, support generation or auto-orientation.
- No document version bump; all settings remain optional and sanitized.
- No silent upgrade of the finish profile on export.

## Dependencies

- `2026-11-06-lattice-cell-contracts`: stable network, openings and provenance.
- `2026-11-06-organic-struts`: organic centerlines, radius profiles, joints and
  the separate finish-quality field.
- `sampling-contract`: existing deterministic chord-refinement conventions.

## Impact

- `src/geometry/latticeSolid.js`: refinement and gauge integration.
- `src/geometry/latticeNetwork.js`: sample metadata and refinement provenance.
- `src/application/fabricationSource.js`: benchmarkable refinement settings.
- `src/geometry/printChecks.js`: measured deviation, gauge and budget report.
- Tests and benchmark scripts; no changes to existing preset semantics.

## Open Questions

1. Is the first deviation tolerance `0.1 mm` sufficient for a 20 mm cell and a
   3.5 mm strut? It must be measured, not assumed.
2. Should the capsule gauge run on every cell or on a budgeted subset in
   `draft`? Recommendation: every interior cell in `standard`/`high`, a
   reported subset in `draft`.
3. Does the SDF joint benchmark justify a new default, or does `rounded`
   remain the only production path? Do not decide before the benchmark.
4. Which screenshot comparison is stable enough for CI: scene geometry,
   canvas pixels with a tolerance, or manual review artifacts?
