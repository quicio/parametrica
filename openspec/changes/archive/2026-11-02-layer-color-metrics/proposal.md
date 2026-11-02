## Why

Color metrics are global. In layered compositions, different layers may need
different metrics (for example curvature on a detail layer and height on the
base) without changing the global default.

## What Changes

- Add optional `layer.colorMetric`, inheriting `view.colorMetric` when null.
- Style exposes a per-layer Color metric selector (Global/Auto/Height/Radius/
  Curvature/Arc length).
- Canvas and SVG use the layer metric when present.
- Preserve global metric behavior and old documents.

## Capabilities

### New Capabilities

- `layer-color-metrics`: per-layer metric override.

### Modified Capabilities

- None.

## Impact

- Modified: `src/core/document.js`, `src/core/engine.js`,
  `src/application/renderSceneBuilder.js`, `src/render/p5/P5Adapter.js`,
  `src/export/Exporter.js`, `src/ui/Controls.js`.
- Tests: `test/lab.smoke.mjs`, `e2e/hardening.spec.js`.
- Docs: README, SPEC, audit, roadmap.
- No new metric; no custom palette editor.

## Non-goals

- No custom palette editor.
- No per-pass metric.
- No new render pass.
