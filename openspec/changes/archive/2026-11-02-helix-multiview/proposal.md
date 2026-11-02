## Why

Spatial documents can show only one projection at a time. Helix exploration
needs the 3D view and the three orthographic views side by side to compare how
the same curve reads in each projection.

## What Changes

- Add `view.layout: 'single' | 'quad'`, default `single`.
- Add a Camera **Layout** control for spatial documents.
- In quad layout, render four panels inside the artboard: 3D, XY, XZ and YZ.
- Reuse `buildRenderScene` with a projection override and the existing pass
  pipeline; compute per-panel analysis and overlays.
- Keep single mode unchanged.
- Capture the quad composition in PNG/GIF through the normal canvas. SVG and
  plotter exports use the active projection and report the canvas-only layout.
- Update tests, docs, audit and roadmap.

## Capabilities

### New Capabilities

- `helix-multiview`: quad canvas layout and projection panels.

### Modified Capabilities

- None.

## Impact

- Modified: `src/core/document.js`,
  `src/application/renderSceneBuilder.js`, `src/render/p5/P5Adapter.js`,
  `src/ui/Controls.js`, `src/export/Exporter.js`.
- Tests: `test/lab.smoke.mjs`, `e2e/helix.spec.js`.
- Docs: README, SPEC, architecture, audit, roadmap.
- No document version bump; old documents default to single.
- No new projection math; no new render passes.

## Non-goals

- No per-panel camera controls.
- No per-panel styles or independent documents.
- No SVG/plotter quad reconstruction; those use the active projection and
  report the canvas-only layout.
- No frame-by-frame changes.
