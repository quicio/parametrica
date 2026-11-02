## Why

Gradient Wireframe currently chooses its color axis implicitly from the
projection: height in 3D/XZ/YZ and radius in XY. Curvature and arc length are
already available in the analysis, but there is no way to use them as color
metrics. The palette/ramp system should expose that choice without adding a new
render pass.

## What Changes

- Add `view.colorMetric: 'auto' | 'height' | 'radius' | 'curvature' | 'arc'`,
  defaulting to `auto`.
- Extend `gradient-wireframe` and `gradientRange` to use the selected metric.
- Compute layer analysis when curvature/arc is selected; auto/height/radius
  remain analysis-free.
- Add a **Gradient metric** control in Render.
- Preserve the existing color ramp, palettes and SVG pass output.
- Update tests, docs and roadmap.

## Capabilities

### New Capabilities

- `color-metrics`: explicit metric-driven color ramp selection.

### Modified Capabilities

- None.

## Impact

- Modified: `src/core/document.js`, `src/render/passes/gradient.js`,
  `src/render/p5/P5Adapter.js`, `src/ui/Controls.js`.
- Tests: `test/lab.smoke.mjs`, `e2e/look.spec.js`.
- Docs: README, SPEC, architecture, audit, roadmap.
- No document version bump.
- No custom palette editor or per-pass color settings.

## Non-goals

- No custom palette storage/editor.
- No per-layer metrics.
- No new render pass.
- No fill-gradient/palette synchronization.
