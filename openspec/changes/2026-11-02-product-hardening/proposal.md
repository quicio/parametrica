## Why

The navigation/responsibility audit found a working product whose UI is no
longer fully truthful about its own state:

- some exposed controls have no effect (`style.blend`, layer lock);
- some implemented settings have no UI (`view.colorRamp`);
- per-layer diagnostic passes can read the wrong layer's analysis;
- SVG export can silently omit active render features;
- LOOK mixes camera, canvas, style, render, diagnostics, image, animation and
  timeline;
- Notebook and Presets are two overlapping persistence libraries.

This change consolidates those findings into a prioritized hardening spec for
the **current** product. It intentionally does not introduce MAKE, a new
renderer, a document v4 or a full navigation rewrite.

## Evidence classification

### Confirmed defects

1. `style.blend` is persisted and exposed in Artboard but no renderer applies
   it (`src/core/document.js`, `src/ui/Controls.js`; no `blendMode` in
   `src/render`).
2. `view.colorRamp` drives `gradient-wireframe` but has no UI
   (`src/render/passes/gradient.js`; absent from `Controls`).
3. `layer.locked` is stored and styled but does not prevent editing,
   selection, reordering or deletion (`App.setLayerLocked`).
4. `App.renameLayer` exists but is not exposed.
5. Layer-scoped `tangents` / `normals` / `curvature` passes receive the
   combined `evaluation.analysis` while indexing that layer's curves
   (`P5Adapter.js`; `analysis/differential.js`).
6. SVG export emits curves and a solid fill only; it does not represent
   gradient wireframe, surface fills or the active pass set (`Exporter.js`).
7. `view.strokeWeight` duplicates `layer.style.stroke.width`; the two are kept
   in sync manually (`App.syncActiveStyle`).
8. Palettes write background/stroke/fill but not `view.colorRamp`; gradient
   wireframe and palette are disconnected (`render/palettes.js`).
9. Every render pass appears as an active toggle even when it cannot run on
   the current geometry (e.g. epicycles on non-Fourier, surface passes without
   meshes).
10. Notebook `notes`/`tags` exist in the model but have no editor UI.
11. Explore randomisation uses an internal seed with no user-visible control.
12. `SPEC.md` §11 still lists a smaller/older render-pass set than the
    registry actually contains.

### Recommendations

- Split LOOK into explicit Camera, Canvas, Style, Render and Overlays groups.
- Group render passes by intent (base, surfaces, color, diagnostics) and show
  applicability/description.
- Add fill modes (solid/linear/radial) and a ramp editor with presets/source.
- Add per-pass settings (ramp, opacity, outline, depth fade, source).
- Move frame-sequence export from Timeline to Export, or make Export link to it.
- Add camera reset and explicit viewport controls.
- Add layer rename UI and Notebook notes/tags editing.
- Add a visible seed to Explore randomisation.
- Deduplicate panel status and telemetry.
- Unify or explicitly relate Notebook and Presets.

### Design decisions still open

- Enforce layer lock or remove the control.
- Whether camera and style changes belong in undo/redo.
- Whether LOOK becomes five sections or a smaller appearance-only mode.
- Whether fill/ramp scope is global, per layer or per pass.
- How faithful SVG must be (warn vs implement gradients/surfaces).
- Whether Notebook and Presets merge, link or remain separate.
- Whether MAKE is a future mode, section or workspace.

## What Changes

### P0 — truthfulness and correctness

- Apply `style.blend` in the p5 layer loop and reset it afterwards, or remove
  the control until it is supported.
- Expose a compact `view.colorRamp` editor (2–6 stops, presets, reset).
- Define the palette/ramp relationship: palettes may declare a ramp; applying
  a palette with a ramp writes it.
- Make layer lock truthful: enforce it or remove the lock affordance.
- Compute layer-scoped analysis for layer passes instead of reusing the
  combined analysis.
- Derive stroke width from `style.stroke.width`; retire the manual
  `view.strokeWeight` duplicate while keeping document compatibility.
- Disable or hide render passes that cannot run on the current geometry, with
  a reason.
- Make SVG export declare/handle unsupported active features instead of
  silently dropping them.

### P1 — clarity and workflow

- Reorganize LOOK into labelled groups while preserving the four-mode shell:
  Camera, Canvas, Style, Render, Overlays.
- Place Image, Animation and Timeline behind an explicit decision; do not
  silently move them in this change.
- Add fill modes and gradient controls to the style model/UI.
- Add ramp presets and a gradient source selector.
- Group render toggles and add descriptions/applicability.
- Add camera reset.
- Add layer rename UI.
- Add Notebook notes/tags editing.
- Add an Explore random seed control.
- Move or link frame export from Timeline into Export.

### P2 — architectural enablers (recommended, not all in this slice)

- Render-pass settings schema with persisted `view.passSettings` (or per-layer
  equivalents).
- Split global canvas/view state from per-layer style in the document model.
- Decide whether render modes are global or per layer.
- Align SVG/PNG export with the RenderScene contract.
- Relate Notebook and Presets through a shared asset identity or an explicit
  distinction.
- Separate viewport history from geometry history.
- Define MAKE only after its first vertical slice and real fabrication output
  are scoped.

## Capabilities

### New Capabilities

- `ui-integrity`: exposed controls are truthful, state scopes are explicit,
  layer data is isolated, render passes declare applicability, appearance
  customization is reachable, and export does not silently diverge from the
  active render scene.

### Modified Capabilities

- None.

## Impact

- `src/ui/Controls.js`, `src/ui/widgets/PresetPanel.js`,
  `src/ui/widgets/NotebookPanel.js`, `src/ui/widgets/ExplorePanel.js`
- `src/application/App.js`
- `src/application/renderSceneBuilder.js`, `src/render/p5/P5Adapter.js`
- `src/render/passes/*.js`, `src/render/palettes.js`
- `src/core/document.js`, `src/core/engine.js`, `src/export/Exporter.js`
- `src/presets/catalog.js`, `src/presets/PresetManager.js`
- tests, e2e, `README.md`, `docs/architecture.md`, `SPEC.md` §11/§16

No document v4, no MAKE implementation, no new renderer, no CSG/STL/3MF.

## Prioritization

| Priority | Items | Impact | Effort |
|---|---|---|---|
| **P0** | blend truthfulness, color ramp UI, layer lock truthfulness, per-layer analysis, pass applicability, export warning, stroke-width single source | High correctness/trust | S–M |
| **P1** | LOOK grouping, fill/ramp controls, pass grouping, camera reset, layer rename, notebook metadata, Explore seed, frame export location | High clarity | M |
| **P2** | pass settings schema, global/layer style split, per-layer render config, export scene parity, unified persistence, viewport history | Strategic | L |

## Non-goals

- No MAKE implementation, no solids/CSG/STL/3MF workflow.
- No full redesign of the four-mode navigation.
- No new renderer, z-buffer or lighting model.
- No document v4 migration.
- No forced merge of Notebook and Presets.
- No automatic decision on global vs per-layer render modes.
