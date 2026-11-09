# Image even-odd fill

**Date:** 2026-11-08
**Status:** implemented

Image tracing can produce a silhouette plus holes. Holes live in separate
Fourier layers, so filling each layer independently would paint the hole back
in. Parametrica now fills a whole trace as one even-odd path.

## Contract

- `traceImageContours` marks every contour with `hole`, `depth`, `parent` and
  `bbox`.
- Depth counts enclosing contours: outer `0`, hole `1`, island inside a hole
  `2`.
- `buildFourierDocuments` writes a shared `trace.group` on every layer and
  keeps one editable Fourier layer per contour.
- The trace metadata is part of the sanitized document, so it survives reload,
  notebook checkpoints and preset round-trips.

## Rendering

- Canvas: `drawEvenOddFill` builds one `Path2D`-style path from all closed
  contours in a trace group and calls `fill('evenodd')`.
- SVG: `SvgContext.fillContours` emits one `<path>` with every subpath and
  `fill-rule="evenodd"`, wrapped in `<g class="svg-trace-fill">`.
- PNG export uses the same canvas path, so raster and SVG agree.
- Strokes are drawn after the fill and never paint over the hole.
- Plotter output remains stroke-only and is unaffected.

## Verification

- `test/domains/image-evenodd.test.mjs`: ring, nested island, solid contour,
  nesting depth, shared group, SVG subpath count and stroke fill suppression.
- `e2e/image-evenodd.spec.js`: traces a synthetic ring in a real browser,
  samples the canvas center and ring, and checks the exported SVG.
