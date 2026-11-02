## Why

Fill is currently a single solid color. The canvas and SVG now share a
pass-recording path, so the missing piece is a document-level fill gradient
model and a Style editor for direction/radial configuration.

## What Changes

- Add `view.style.fill.gradient` (and per-layer equivalents):
  - `enabled`, `type: 'linear' | 'radial'`;
  - `angle` for linear;
  - `centerX`, `centerY`, `radius` for radial;
  - 2–4 color stops.
- Sanitize the new model with backward-compatible defaults.
- Add Style controls: fill type, angle, center/radius and color stops.
- Render gradient fills for closed curves and Surface Fill.
- Export gradient fills to SVG with `<linearGradient>` / `<radialGradient>`.
- Update docs, the navigation audit and tests.

The existing **Gradient Wireframe** pass keeps its height/radius semantics; it
is not the same feature and is not changed.

## Capabilities

### New Capabilities

- `fill-gradients`: linear/radial fill model, Style controls, canvas rendering
  and SVG output.

### Modified Capabilities

- None.

## Impact

- New: `src/core/fillGradient.js`, `src/render/fill.js`.
- Modified: `src/core/document.js`, `src/render/passes/core.js`,
  `src/render/passes/surface.js`, `src/export/svgContext.js`,
  `src/ui/Controls.js`, `style.css`.
- Tests: `test/lab.smoke.mjs`, `e2e/hardening.spec.js` or a focused style e2e.
- Docs: README, SPEC, architecture, audit, style/export specs.
- No document version bump; old documents get `gradient.enabled = false`.

## Non-goals

- No change to Gradient Wireframe semantics.
- No gradient strokes.
- No per-point/procedural gradient fields.
- No SVG frame sequence, plotter-ready SVG or MAKE.
- No new color-ramp/palette synchronization.
