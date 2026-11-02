## 1. Phase 1 — LOOK information architecture

- [ ] 1.1 Extract Camera from the current View section: projection, CAD
      guides and camera reset. Verify with `e2e/panel.spec.js` and a focused
      LOOK e2e test.
- [ ] 1.2 Extract Canvas from Artboard: artboard preset, width, height,
      background and margin. Keep these labelled global. Verify with
      `e2e/ui.spec.js` (artboard/style controls) and the LOOK e2e test.
- [ ] 1.3 Extract Style from Artboard: active-layer stroke, fill, blend and
      palette, with an explicit active-layer label. Verify with
      `e2e/ui.spec.js` and `test/lab.smoke.mjs` style round-trip tests.
- [ ] 1.4 Create a Render section with grouped passes and short descriptions.
      Add optional `group` / `description` render-pass metadata while
      preserving the existing `appliesTo` behavior. Verify with
      `test/lab.smoke.mjs` (all passes expose valid group/description) and an
      e2e grouping test.
- [ ] 1.5 Create an Overlays section for the existing diagnostic overlays.
      Verify with `e2e/panel.spec.js`.
- [ ] 1.6 Add Reset camera: yaw/pitch/FOV to defaults; disabled or hidden in
      orthographic projection. Verify with `e2e/helix.spec.js` or a focused
      camera e2e test.
- [ ] 1.7 Add a color-ramp editor for the existing `view.colorRamp`: 2–6
      stops, add/replace/remove, reset, live preview. Keep the ramp global in
      this phase. Verify with `e2e/ui.spec.js` (canvas change) and
      `test/lab.smoke.mjs` sanitization.
- [ ] 1.8 Group Image, Animation and Timeline under a visible temporary Work
      label without moving them. Verify with the LOOK e2e test.
- [ ] 1.9 Add scope labels/help for Camera, Canvas, Style, Render, Overlays
      and Work. Verify with an accessibility/copy e2e check.
- [ ] 1.10 Migrate persisted UI section state from `view`/`artboard` to the new
      ids without breaking the selected mode. Verify with
      `e2e/panel.spec.js` reload coverage and a focused UI-state unit test if
      `loadUiState` is extracted.
- [ ] 1.11 Update README, `docs/architecture.md` and `SPEC.md` §16 only for the
      new LOOK structure. Update test counts.

## 2. Verification

- [ ] 2.1 Run `npm run check`.
- [ ] 2.2 Run the full Playwright suite.
- [ ] 2.3 Validate OpenSpec and archive after acceptance.

## Phase 2 — pending decision (not acceptance)

Do not implement until a navigation decision is approved:

- [ ] Decide Ingest + Perform vs one Work mode vs keeping ingest/time in LOOK.
- [ ] Move Image to the chosen ingest destination.
- [ ] Move Animation + Timeline to the chosen time destination.
- [ ] Decide whether frame export belongs to Export, Perform or both.
- [ ] Remove the temporary Work group from LOOK.
- [ ] Update UI state/mode migration and e2e coverage.

## Acceptance criteria (Phase 1)

- LOOK is split into Camera, Canvas, Style, Render and Overlays.
- Canvas global controls and active-layer Style controls are no longer mixed.
- Every ambiguous control states its scope.
- Render passes are grouped with descriptions and preserve applicability.
- Camera reset works in 3D and is unavailable in orthographic views.
- The existing color ramp is editable and persists.
- Image/Animation/Timeline are clearly labelled as temporary Work tools.
- Persisted mode/section state does not break.
- Existing documents and presets load without changes.
- No fill gradients, per-pass settings, per-layer modes, history changes,
  MAKE or export-parity work.

## Verification results

Pending implementation.
