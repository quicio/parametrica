## Why

The 1D strip shows a family along one axis, but many discoveries need two
axes, and the most useful transition is often a morph between two known forms.
This slice adds a 2D grid and a same-structure morph.

## What Changes

- Add a 2D variation grid (`N×M`) with axis labels and shared thumbnail scale.
- Add cell adoption using the existing exploration context-preserving path.
- Add A→B morph in parameter space for structurally compatible documents.
- Add a step preview and save-sequence action.
- Reuse the thumbnail and candidate-budget infrastructure.
- Add unit and e2e coverage.

## Capabilities

### New Capabilities

- `exploration-grid-panel`: 2D candidate grids and same-structure parameter
  morphing.

### Modified Capabilities

- None. `exploration-session` defines the sweep/morph contracts; this slice
  implements the 2D panel and morph preview.

## Impact

- `src/lab/exploration.js` (2D grid + morph)
- `src/ui/widgets/ExplorePanel.js`, maybe a dedicated GridPanel
- `src/render/thumbnail.js`
- `e2e/ui.spec.js`, `test/lab.smoke.mjs`
- `README.md`, `SPEC.md`

## Non-goals

- No topology-changing morph.
- No image crossfade beyond the documented fallback.
- No 3D grid or animation export.
- No automatic scoring of grid cells.
