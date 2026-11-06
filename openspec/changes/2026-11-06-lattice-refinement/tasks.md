## 1. Contract

- [ ] 1.1 Define `RefinementSpec`, defaults and clamping; keep it derived.
- [ ] 1.2 Define deterministic split order, tie-break and budget rules.
- [ ] 1.3 Define chord and surface deviation metrics.
- [ ] 1.4 Define provenance fields for refinement hashes and measurements.
- [ ] 1.5 Define the `measured` / `estimate` vocabulary for opening checks.

## 2. Adaptive sampling

- [ ] 2.1 Subdivide edges in `(θ,z)` by chord deviation.
- [ ] 2.2 Respect min/max samples and global point budget.
- [ ] 2.3 Preserve endpoints, node ids, edge ids and cell ids.
- [ ] 2.4 Keep seam unwrap and surface mapping after subdivision.
- [ ] 2.5 Fall back to polyline when the profile is unavailable and report it.
- [ ] 2.6 Add tests for determinism, caps, deviation and topology identity.

## 3. Openings and validation

- [ ] 3.1 Define the capsule gauge geometry and orientation.
- [ ] 3.2 Implement the capsule gauge with a deterministic triangle query.
- [ ] 3.3 Keep the point-clearance estimate as an explicit cheaper mode.
- [ ] 3.4 Report checked/skipped cells and per-cell violations.
- [ ] 3.5 Verify the gauge after post-processing and Manifold repair.

## 4. Budgets and finish profiles

- [ ] 4.1 Map `draft` / `standard` / `high` to refinement caps.
- [ ] 4.2 Record points, triangles, build time and gauge time.
- [ ] 4.3 Report the resolved profile through the worker and Fabricate.
- [ ] 4.4 Prevent silent profile upgrades on preview or export.
- [ ] 4.5 Decide whether any budget becomes a CI gate only after measurement.

## 5. Joint decision gate

- [ ] 5.1 Implement a timeboxed local SDF joint spike.
- [ ] 5.2 Benchmark SDF against `rounded` on the two lattice presets.
- [ ] 5.3 Measure manifold validity, opening preservation, triangles and time.
- [ ] 5.4 Keep `rounded` as default unless every gate passes.
- [ ] 5.5 Report the chosen method, fallback count and reason.

## 6. Benchmarks and visual evidence

- [ ] 6.1 Add a Node benchmark for 15/20/25 mm on both lattice presets.
- [ ] 6.2 Record points, triangles, build time, volume and opening results.
- [ ] 6.3 Add golden/visual-review artifacts for network and solid preview.
- [ ] 6.4 Document provisional thresholds before enabling any gate.
- [ ] 6.5 Confirm the three existing vase presets do not regress.

## 7. Acceptance

- [ ] 7.1 Unit tests for refinement, deviation, gauge and budgets.
- [ ] 7.2 Regression tests for the three existing vase presets and exports.
- [ ] 7.3 E2E for the organic preset at `draft` and `high`.
- [ ] 7.4 Benchmark report committed with measured values.
- [ ] 7.5 Docs updated and full gates run.

## Acceptance criteria

- Same spec, algorithm version, finish quality and refinement spec produce the
  same mesh hash.
- Refinement inserts samples only; network identity and opening topology are
  unchanged.
- Surface and chord deviations are reported; the organic fallback is explicit.
- The opening report distinguishes measured capsule results from estimates.
- The selected finish profile reaches the worker, report and export.
- SDF does not become the default without benchmark evidence.
- Existing presets and exports do not regress.
