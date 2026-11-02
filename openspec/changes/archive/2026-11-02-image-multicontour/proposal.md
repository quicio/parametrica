## Why

Image input currently traces only the largest connected silhouette. Many
reference images contain several separate shapes, and re-running the trace
cannot recover them. Ingest should be able to turn each visible silhouette into
an editable Fourier curve without a new tracing engine.

## What Changes

- Add `traceImageContours()`: label all 4-connected components, filter by area,
  cap the count, and trace each one through the existing boundary → RDP →
  resample → Fourier pipeline.
- Add `buildFourierDocuments()`: one layer per traced contour.
- Add an **All contours** toggle in Image; default remains largest only.
- Render all contours in the preview and report the count/average RMS.
- Apply multiple contours as separate Fourier layers.
- Preserve the existing single-contour API and behavior.

## Capabilities

### New Capabilities

- `image-multicontour`: multi-component tracing and multi-layer Fourier apply.

### Modified Capabilities

- None.

## Impact

- Modified: `src/input/imageTrace.js`,
  `src/ui/widgets/ImagePanel.js`.
- Tests: `test/lab.smoke.mjs`, `e2e/ui.spec.js`.
- Docs: README, SPEC, architecture, audit, roadmap.
- No image data enters the document; only harmonics.
- No hole-aware fill, contour hierarchy or new tracing algorithm.

## Non-goals

- No hole-aware/even-odd fill representation.
- No contour hierarchy or nesting UI.
- No new threshold, segmentation or vectorisation algorithm.
- No change to Ingest placement or the single-contour default.
