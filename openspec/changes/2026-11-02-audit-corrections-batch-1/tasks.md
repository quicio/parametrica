## 1. Implementation

- [ ] 1.1 Make `layer.style.stroke.width` the single authoritative width;
      derive the legacy `view.strokeWeight` on load/sync; remove independent
      view-width writes from the style UI. Verify with `test/lab.smoke.mjs`
      (legacy height/width migration and style round-trip) and
      `e2e/ui.spec.js`.
- [ ] 1.2 Add a Rename action to each Layers row using
      `App.renameLayer` + `DialogService.prompt`; trim, reject empty, enforce
      80 chars, rebuild the panel and status. Rename stays available under
      content lock (identity action). Verify with a new
      `e2e/batch1.spec.js` case and `test/lab.smoke.mjs` layer validation.
- [ ] 1.3 Add an inline Notebook metadata editor for notes and tags; save via
      `Notebook.update`, enforce existing limits, persist/reload, and keep tags
      visible in the item. Verify with `e2e/batch1.spec.js` and
      `test/lab.smoke.mjs` Notebook sanitization.
- [ ] 1.4 Add an Explore seed field and New seed action backed by UI-only
      `app.exploreSeed`; Randomize selected uses the current seed without
      advancing it. Verify with `test/lab.smoke.mjs` deterministic randomize
      and `e2e/batch1.spec.js`.
- [ ] 1.5 Split panel status and canvas telemetry: panel keeps active-layer
      context; telemetry keeps curves/performance/time/seed/state. Remove
      duplicated model/layer/operator fields from telemetry. Verify with
      `e2e/panel.spec.js` and `e2e/ui.spec.js`.
- [ ] 1.6 Update `SPEC.md` §11 to the current 14 render passes and 4 overlays;
      update README/architecture lists or counts affected by this batch. This
      is complementary documentation, not a behavioral requirement.

## 2. Verification

- [ ] 2.1 Run `npm run check`.
- [ ] 2.2 Run the full Playwright suite.
- [ ] 2.3 Validate OpenSpec and archive after acceptance.

## Deferred

Do not include in this batch:

- LOOK split, color ramp, camera reset, pass grouping, Work group,
  Image/Animation/Timeline placement and frame export → 
  `2026-11-02-look-reorganization`.
- Fill gradients, per-pass settings, per-layer render modes.
- History/undo scope, SVG parity, Notebook/Presets relation.
- Broader layer-lock scope.
- MAKE, solids, CSG, STL/3MF, renderer rewrite.

## Acceptance criteria

- Stroke width has one authoritative stored value per layer; legacy documents
  load without a version bump.
- Layer rename works, persists and leaves other layers unchanged; it remains
  available under content lock.
- Notebook notes/tags are editable, limited, persisted and reload correctly.
- Explore exposes a visible seed; the same seed reproduces candidates, and New
  seed changes it.
- Panel status and telemetry have distinct, non-duplicated responsibilities.
- `SPEC.md` §11 matches the registered render passes and overlays.
- No LOOK reorganization, new fill/per-pass/per-layer-mode feature, history
  change, MAKE or export-parity work.

## Verification results

Pending implementation.
