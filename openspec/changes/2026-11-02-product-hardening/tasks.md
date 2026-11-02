## 1. P0 — truthfulness and correctness

- [ ] 1.1 Apply `style.blend` in the p5 layer loop and reset to normal after
      each layer, or remove the control if the renderer cannot support it.
      Verify with `e2e/ui.spec.js` (blend changes the canvas) and
      `test/lab.smoke.mjs` (style round-trip).
- [ ] 1.2 Enforce layer lock or remove the lock affordance. A locked layer
      must block generator, parameter, equation, operator, style, rename,
      reorder and delete mutations, while visibility stays independent.
      Verify with `e2e/ui.spec.js` and `test/lab.smoke.mjs`.
- [ ] 1.3 Replace combined analysis in per-layer passes with layer-scoped
      analysis (lazy where possible); keep overlays on combined analysis.
      Verify with a multi-layer unit test in `test/lab.smoke.mjs`.
- [ ] 1.4 Add a `view.colorRamp` editor (2–6 stops, add/replace, reset) and
      connect palettes that declare a ramp. Verify with
      `e2e/ui.spec.js` (changing a stop changes the canvas).
- [ ] 1.5 Add render-pass `group`, `description` and `appliesTo` metadata;
      disable or hide inapplicable passes with a reason. Verify with
      `test/lab.smoke.mjs` and `e2e/ui.spec.js`.
- [ ] 1.6 Make `layer.style.stroke.width` the single authority; derive/ignore
      `view.strokeWeight` for old documents. Verify with
      `test/lab.smoke.mjs` legacy-document cases.
- [ ] 1.7 Detect SVG-omitted active features (gradient wireframe, surface fill,
      overlays, diagnostics) and show a notice; keep PNG as the faithful
      raster export. Verify with `test/lab.smoke.mjs` and an export e2e test.

## 2. P1 — clarity and workflow

- [ ] 2.1 Split LOOK into labelled groups: Camera, Canvas, Style, Render,
      Overlays, preserving the four-mode shell. Verify with
      `e2e/panel.spec.js`.
- [ ] 2.2 Add fill modes (none/solid/linear/radial) with stops and angle;
      migrate `fill.enabled` to `none/solid`. Verify with unit and e2e canvas
      tests.
- [ ] 2.3 Add ramp presets and a gradient source selector (auto/height/radius/
      x/y/index) for the gradient pass. Verify with e2e.
- [ ] 2.4 Add a camera reset action and explicit viewport controls. Verify
      with `e2e/helix.spec.js` or a focused camera e2e test.
- [ ] 2.5 Add layer rename UI. Verify with `e2e/panel.spec.js`.
- [ ] 2.6 Add Notebook notes/tags editing, or remove those fields from the
      model/UI if they are not wanted. Verify with `e2e/ui.spec.js` and
      `test/lab.smoke.mjs`.
- [ ] 2.7 Add an Explore random seed field, display the active seed and support
      “new seed”. Verify with `e2e/ui.spec.js` (same seed = same candidates).
- [ ] 2.8 Move frame-sequence export into Export or link Export to Timeline;
      keep the existing ZIP output. Verify with `e2e/ui.spec.js`.
- [ ] 2.9 Deduplicate panel status and telemetry so each shows distinct,
      complementary information. Verify with `e2e/panel.spec.js`.
- [ ] 2.10 Normalize language/copy in the affected sections (English UI copy,
      or consistent bilingual labels) without changing behavior. Verify with
      a UI copy test or manual review.

## 3. Verification and documentation

- [ ] 3.1 Update `SPEC.md` §11/§16, `README.md` and
      `docs/architecture.md` to match the implemented render passes, scopes and
      export limitations.
- [ ] 3.2 Run `npm run check` and the full Playwright suite.
- [ ] 3.3 Validate OpenSpec and archive after acceptance.

## Deferred recommendations (P2, not in this slice)

These are architectural enablers, not requirements of this change:

- Render-pass settings schema and persisted `view.passSettings`.
- Split global canvas/view state from per-layer style in the document model.
- Decide whether render modes are global or per layer.
- Bring SVG export to full RenderScene parity (gradients, meshes, overlays).
- Relate Notebook and Presets through shared asset identity or an explicit
  distinction.
- Separate viewport history from geometry history.
- Define MAKE only after its first vertical slice and a real fabrication
  export are scoped.

## Acceptance criteria

- Every exposed control has an observable effect or is disabled/removed with a
  reason.
- Layer lock is truthful, and per-layer diagnostic passes use layer analysis.
- Gradient wireframe has an editable, persistent ramp; palette/ramp behavior is
  explicit.
- Inapplicable render passes are not presented as effective.
- SVG export warns about unsupported active features; PNG remains faithful.
- Stroke width has one authoritative stored value.
- Explore randomisation exposes a reproducible seed.
- Existing documents load without a document version bump.
- No MAKE, solids, CSG, STL/3MF, new renderer or navigation rewrite.

## Verification results

Pending implementation.
