## 1. Mandatory hardening (P0)

- [ ] 1.1 Replace combined analysis in layer diagnostic passes with
      layer-scoped analysis, computed lazily where possible. Keep global
      overlays on combined analysis. Verify with a two-layer unit test in
      `test/lab.smoke.mjs`.
- [ ] 1.2 Record the expected blend behavior and resolution criteria in
      `design.md` D3, then choose apply-or-remove against them. If applied,
      reset the blend mode before the next layer; do not ship a partial
      implementation as fully supported. Verify with `e2e/ui.spec.js` (canvas
      changes) and the style round-trip test in `test/lab.smoke.mjs`.
- [ ] 1.3 Define and enforce the content-lock scope from `design.md` D2, or
      remove the lock affordance. A declared content lock blocks generator,
      parameter, equation/harmonic, operator and style edits; selection and
      visibility remain available; rename, reorder, delete and duplicate are
      not claimed as blocked unless explicitly included. Verify with
      `e2e/ui.spec.js` and `test/lab.smoke.mjs`.
- [ ] 1.4 Add render-pass `appliesTo` metadata; disable inapplicable passes
      with a reason, or omit them when they would be meaningless. Verify with
      `test/lab.smoke.mjs` and `e2e/ui.spec.js`.
- [ ] 1.5 Detect SVG-omitted active features (gradient wireframe, surface fill,
      overlays, diagnostics) and show a visible notice; keep PNG as the faithful
      raster export. Verify with `test/lab.smoke.mjs` and an export e2e test.
## 2. Complementary documentation

- [ ] 2.1 Update the render-pass/export limitation notes in `SPEC.md`,
      `README.md` or `docs/architecture.md` only where the hardening changes
      the documented behavior. This is complementary documentation, not a sixth
      P0 defect.

## 3. Verification

- [ ] 3.1 Run `npm run check`.
- [ ] 3.2 Run the full Playwright suite.
- [ ] 3.3 Validate OpenSpec and archive after acceptance.

## Deferred (not tasks in this change)

P1/P2 items are recorded in the recommendation register in `proposal.md` and
must not be added here without separate validation. The LOOK ownership proposal
is explicitly pending and is not part of this change.

## Acceptance criteria

- A layer-scoped diagnostic pass uses its own layer's analysis.
- Blend resolves against the documented criteria: visibly applied, or no longer
  exposed as a supported control.
- Lock enforces its declared content scope or no longer appears as a lock
  affordance; structural/identity actions are not claimed unless included.
- Inapplicable render passes are not presented as effective.
- SVG export warns about omitted active features; PNG remains the faithful
  raster export.
- Existing documents load without a document version bump.
- No navigation change, new appearance feature, per-pass settings, MAKE,
  solids, CSG, STL/3MF or renderer rewrite.

## Verification results

Pending implementation.
