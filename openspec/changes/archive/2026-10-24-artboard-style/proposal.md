## Why

Parametrica's canvas is hard-coded to a square black field and a white
monoline. The analysis and exploration slices made forms discoverable, but the
artistic surface is still fixed. The next slice gives the work an artboard and
a style system so a discovered form can become a presentable piece.

## What Changes

- Add `view.artboard` with width, height, background, margin and a set of
  aspect presets (square, portrait, landscape, A-series).
- Add `view.style` for the current single layer: stroke color, width, opacity,
  cap/join, optional fill and blend.
- Add a curated palette set (monochrome, paper, signal, dusk, high contrast).
- Render the canvas from the artboard instead of the container dimensions.
- Export SVG and PNG faithfully from artboard + style.
- Add UI controls and a preview of the style/artboard.
- Migrate old documents to the default square black artboard/style.

## Capabilities

### New Capabilities

- `artboard-style-panel`: artboard, color, stroke, fill, palette and export
  fidelity for the current single layer.

### Modified Capabilities

- None. `composition-model` already defines the long-term layer style and
  artboard contracts; this slice implements their single-layer subset.

## Impact

- `src/core/document.js` (artboard/style sanitization + defaults)
- `src/render/P5Renderer.js`, `src/render/passes/core.js`
- `src/export/Exporter.js`
- `src/ui/Controls.js`, new style/artboard widgets
- `test/lab.smoke.mjs`, `e2e/ui.spec.js`
- `README.md`, `SPEC.md`

## Non-goals

- No multi-layer composition yet.
- No video/animation export.
- No custom gradient editor or image textures.
- No CMYK/print color management.
