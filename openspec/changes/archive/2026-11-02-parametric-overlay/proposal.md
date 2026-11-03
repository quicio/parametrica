## Why

The bottom telemetry reports curve counts, length, time, seed and validity, but
not the shape's parametric values. Users need to read the active figure's
generator parameters without keeping the Form panel open.

## What Changes

- Add a pure `buildParametricSummary()` model for the active layer.
- Add a minimal DOM overlay at the canvas edge:
  - generator and layer name;
  - parameter labels/values, advanced values visually secondary;
  - seed and active operator names.
- Add a `ƒ` show/hide button on the canvas and a Canvas **Parametrics** toggle.
- Persist visibility locally; update on evaluation/layer changes.
- Keep the overlay UI-only and read-only.

## Capabilities

### New Capabilities

- `parametric-overlay`: active-shape property HUD.

### Modified Capabilities

- None.

## Impact

- New: `src/lab/parametricSummary.js`, `src/ui/ParametricOverlay.js`.
- Modified: `src/application/App.js`, `src/ui/Controls.js`, `style.css`.
- Tests: `test/lab.smoke.mjs`, `e2e/panel.spec.js`.
- Docs: README, SPEC, architecture, audit, roadmap.
- No document format change.
- No new parameters or editing surface.

## Non-goals

- No inline editing.
- No parameter history or charts.
- No per-point value inspector.
- No document mutation.
