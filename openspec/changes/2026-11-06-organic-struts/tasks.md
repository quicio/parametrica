## 1. Curves and sections

- [x] 1.1 Implement centripetal Catmull-Rom in surface coordinates.
- [ ] 1.2 Unwrap the seam and project 3D fallbacks within tolerance.
- [ ] 1.3 Derive tangents and preserve G1 on degree-2 chains.
- [ ] 1.4 Adaptive sampling by chord deviation.
- [ ] 1.5 Variable radius (constant/taper/expression) with clamps.
- [x] 1.6 Circular section sweep with per-ring radius.

## 2. Joints

- [x] 2.1 Keep `technical` sphere joints.
- [x] 2.2 Add `rounded` higher-resolution joints.
- [x] 2.3 Define the local region, overlap and integration contract.
- [ ] 2.4 Spike/benchmark local SDF + `Manifold.levelSet` vs rounded.
- [ ] 2.5 Select blend nodes by degree/angle/budget.
- [x] 2.6 Fallback to rounded and report failures.
- [x] 2.7 Preserve openings (width/gauge; blend radius).
- [x] 2.8 Clear `manifoldGuaranteed` after post-processing and revalidate.

## 3. Envelope and quality

- [x] 3.1 Implement `centerline` and `outer` envelope modes.
- [x] 3.2 Define separate finish profiles and their serialized field.
- [x] 3.3 Pass the profile through main thread, worker, report and export.
- [x] 3.4 Enforce strut/joint/opening-width minima; opening gauge.
- [x] 3.5 Extend print checks with measured features.

## 4. Preset and integration

- [x] 4.1 Add `Organic Lattice Vase 200`.
- [x] 4.2 Keep `Lattice Vase 200` technical.
- [x] 4.3 Wire the builder into Fabricate/worker.
- [x] 4.4 Preview/export quality behavior.

## 5. Acceptance

- [x] 5.1 Unit tests curves/radius/joints/validation.
- [x] 5.2 Regression of the three existing vases.
- [x] 5.3 E2E organic preset preview/export.
- [ ] 5.4 Benchmark SDF vs rounded, 15/20/25 mm, time/triangles/memory.
- [ ] 5.5 Confirm provisional thresholds before gating.
- [x] 5.6 Docs and full gates.

## Acceptance criteria

- Closed/manifold/oriented/positive volume or explicit failure.
- Every interior opening passes the width gauge; exceptions are reported.
- Strut and joint minima respected.
- Outer envelope within the measured tolerance; ±1 mm is provisional.
- Organic visual review passes; no visible gaps or kinks on degree-2 chains.
- Finish quality reaches worker/preview/export; no silent upgrade.
- SDF vs rounded benchmark complete; time thresholds are provisional.
- Existing presets and exports do not regress.
