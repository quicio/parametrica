## 1. Profile contract

- [x] 1.1 Define `ManufacturingProfile`, defaults and sanitization.
- [x] 1.2 Define FDM 0.4, Resin and Custom presets as provisional values.
- [x] 1.3 Decide and document persistence location and field name.
- [x] 1.4 Preserve older documents without version changes.
- [x] 1.5 Add profile round-trip and clamp tests.

## 2. Report

- [x] 2.1 Define `ManufacturingReport`, check entries and overall state.
- [x] 2.2 Define `measured`, `declared`, `estimated` and `unavailable` labels.
- [x] 2.3 Reuse overhang, bed, minimum feature and opening measurements.
- [x] 2.4 Add strut and joint checks from lattice stats.
- [x] 2.5 Represent wall thickness as declared or unavailable, not invented.
- [x] 2.6 Test known synthetic cases and source labels.

## 3. Gating

- [x] 3.1 Keep invalid geometry and missing units as hard blocks.
- [x] 3.2 Default manufacturing checks to warnings.
- [x] 3.3 Implement `block` mode for failing checks.
- [x] 3.4 Ensure `unavailable` is not reported as passing.
- [x] 3.5 Test warn/block/unknown policy and export reasons.

## 4. Integration

- [x] 4.1 Resolve the profile in the main thread and include it in preparation.
- [x] 4.2 Pass it through the worker without re-defaulting.
- [x] 4.3 Show profile and check table in Fabricate.
- [x] 4.4 Keep preview and export on the same source profile.
- [ ] 4.5 Add an optional manual slicer-verification record.

## 5. Presets and documentation

- [x] 5.1 Ship default profiles for the lattice and vase presets.
- [x] 5.2 Confirm existing preset exports do not regress.
- [x] 5.3 Document provisional values, limits and external validation.
- [x] 5.4 Update architecture, roadmap and Fabricate docs.
- [x] 5.5 Run full gates.

## Acceptance criteria

- The profile is optional, sanitized and round-trips.
- Every check carries an accurate source label and severity.
- Invalid geometry and missing units still block export.
- Manufacturing warnings are non-blocking by default; `block` is explicit.
- The profile reaches the worker, report and export unchanged.
- Wall thickness is never presented as measured without a real estimator.
- Existing presets and exports do not regress.
