## 1. Mandatory hardening (P0)

- [ ] 1.1 Replace combined analysis in layer diagnostic passes with
      layer-scoped analysis, computed lazily where possible. Keep global
      overlays on combined analysis. Verify with a two-layer unit test in
      `test/lab.smoke.mjs`.
- [ ] 1.2 Make the blend control truthful: apply it in rendering or remove the
      control. If applied, reset the blend mode before the next layer. Verify
      with `e2e/ui.spec.js` (canvas changes) and the style round-trip test in
      `test/lab.smoke.mjs`.
- [ ] 1.3 Make layer lock truthful: enforce it or remove the affordance. If
      enforced, a locked layer cannot be mutated through generator, parameter,
      equation, operator, style, rename, reorder or delete controls. Selection
      semantics remain an open decision. Verify with `e2e/ui.spec.js` and
      `test/lab.smoke.mjs`.
- [ ] 1.4 Add render-pass `appliesTo` metadata; disable inapplicable passes
      with a reason, or omit them when they would be meaningless. Verify with
      `test/lab.smoke.mjs` and `e2e/ui.spec.js`.
- [ ] 1.5 Detect SVG-omitted active features (gradient wireframe, surface fill,
      overlays, diagnostics) and show a visible notice; keep PNG as the faithful
      raster export. Verify with `test/lab.smoke.mjs` and an export e2e test.
- [ ] 1.6 Update the render-pass/export limitation notes in `SPEC.md`,
      `README.md` or `docs/architecture.md` only where the hardening changes
      the documented behavior.

## 2. Verification

- [ ] 2.1 Run `npm run check`.
- [ ] 2.2 Run the full Playwright suite.
- [ ] 2.3 Validate OpenSpec and archive after acceptance.

## Deferred (not tasks in this change)

P1/P2 items are recorded in the recommendation register in `proposal.md` and
must not be added here without separate validation. The LOOK ownership proposal
is explicitly pending and is not part of this change.

## Acceptance criteria

- A layer-scoped diagnostic pass uses its own layer's analysis.
- Blend is either visibly applied or no longer exposed.
- Lock either prevents mutation or no longer appears as a lock affordance.
- Inapplicable render passes are not presented as effective.
- SVG export warns about omitted active features; PNG remains the faithful
  raster export.
- Existing documents load without a document version bump.
- No navigation change, new appearance feature, per-pass settings, MAKE,
  solids, CSG, STL/3MF or renderer rewrite.

## Verification results

Pending implementation.
