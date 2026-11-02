## 1. Phase 1 — LOOK information architecture

- [x] 1.1 Extract Camera from the current View section: projection, CAD
      guides and camera reset. Keep projection gated by the active layer and
      applied globally. Verify with `e2e/panel.spec.js` and a focused LOOK e2e
      test.
- [x] 1.2 Extract Canvas from Artboard: artboard preset, width, height,
      background and margin. Keep these labelled global. Verify with
      `e2e/ui.spec.js` (artboard/style controls) and the LOOK e2e test.
- [x] 1.3 Extract Style from Artboard: active-layer stroke, fill, blend and
      palette, with an explicit active-layer label. Keep `view.style` as the
      active-layer alias; do not add a duplicate global style. Verify with
      `e2e/ui.spec.js` and `test/lab.smoke.mjs` style round-trip tests.
- [x] 1.4 Create a Render section with grouped passes and short descriptions.
      Add optional `group` / `description` render-pass metadata while
      preserving the existing `appliesTo` behavior. Verify with
      `test/lab.smoke.mjs` (all passes expose valid group/description) and an
      e2e grouping test.
- [x] 1.5 Create an Overlays section for the existing diagnostic overlays.
      Verify with `e2e/panel.spec.js`.
- [x] 1.6 Add Reset camera: yaw/pitch/FOV to defaults; disabled or hidden in
      orthographic projection; undoable through the existing history path.
      Verify with `e2e/helix.spec.js` or a focused camera e2e test.
- [x] 1.7 Add a color-ramp editor for the existing `view.colorRamp`: 2–6
      stops, add/replace/remove, reset, live preview. Keep the ramp global and
      independent from the palette; no implicit sync. Verify with
      `e2e/ui.spec.js` (canvas change and palette independence) and
      `test/lab.smoke.mjs` sanitization.
- [x] 1.8 Group Image, Animation and Timeline under a visible temporary Work
      label without moving them; all three stay in LOOK for Phase 1. Verify
      with the LOOK e2e test.
- [x] 1.9 Add scope labels/help for Camera, Canvas, Style, Render, Overlays
      and Work. Verify with an accessibility/copy e2e check.
- [x] 1.10 Migrate persisted UI section state from `view`/`artboard` to the new
      ids without breaking the selected mode. Verify with
      `e2e/panel.spec.js` reload coverage and a focused UI-state unit test if
      `loadUiState` is extracted.
- [x] 1.11 Update README, `docs/architecture.md` and `SPEC.md` §16 only for the
      new LOOK structure. Update test counts.

## 2. Verification

- [x] 2.1 Run `npm run check`.
- [x] 2.2 Run the full Playwright suite.
- [x] 2.3 Validate OpenSpec and archive after acceptance.

## Phase 2 — pending decision (not acceptance)

Do not implement until a navigation decision is approved:

- Decide Ingest + Perform vs one Work mode vs keeping ingest/time in LOOK.
- Move Image to the chosen ingest destination.
- Move Animation + Timeline to the chosen time destination.
- Decide whether frame export belongs to Export, Perform or both.
- Remove the temporary Work group from LOOK.
- Update UI state/mode migration and e2e coverage.

## Acceptance criteria (Phase 1)

- LOOK is split into Camera, Canvas, Style, Render and Overlays.
- Canvas global controls and active-layer Style controls are no longer mixed.
- `view.style` remains the active-layer alias; no duplicate global style.
- Projection stays gated by the active layer and applies globally.
- Every ambiguous control states its scope.
- Render passes are grouped with descriptions and preserve applicability.
- Camera reset works in 3D, is unavailable in orthographic views and is
  undoable through the existing history.
- The existing color ramp is editable, persists and stays independent from the
  palette.
- Image/Animation/Timeline are clearly labelled as temporary Work tools and
  remain in LOOK for Phase 1.
- Persisted mode/section state does not break.
- Existing documents and presets load without changes.
- No fill gradients, per-pass settings, per-layer modes, history changes,
  MAKE or export-parity work.

## Verification results

- `npm run check`: lint, **1609/1609** unit checks and production build pass.
- `npm run test:e2e`: **91/91** Playwright tests pass.
- `openspec validate --changes --strict`: pass.
- New `e2e/look.spec.js` covers the five LOOK sections, Work group, render
  grouping/descriptions, camera reset undo, ramp editing, palette independence
  and old UI-state aliasing.
- Existing camera/projection, render-mode, artboard/style, surface and layer
  e2e flows were updated to the new sections and remain green.
- `SPEC.md` §16, README and architecture notes describe the new LOOK structure
  and counts.

Phase 2 remains a pending navigation decision; no ingest/time relocation was
implemented.
