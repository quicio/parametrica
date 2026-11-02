## Why

Multi-contour tracing finds separate foreground silhouettes but ignores holes
inside them. A ring or donut currently loses its inner boundary. Ingest should
detect internal background components and expose them as editable contours.

## What Changes

- Extend `traceImageContours()` with hole detection:
  - label background components in the padded mask;
  - ignore components touching the image border;
  - trace internal holes with the same boundary → RDP → Fourier pipeline;
  - mark results with `hole: true`.
- Include holes in the bounded contour selection and report `holeCount`.
- Name hole layers explicitly when applying.
- Keep largest-contour default unchanged.
- Document that holes are contours, not yet even-odd filled regions.

## Capabilities

### New Capabilities

- `image-holes`: internal hole contour detection and editable layers.

### Modified Capabilities

- None.

## Impact

- Modified: `src/input/imageTrace.js`,
  `src/ui/widgets/ImagePanel.js`.
- Tests: `test/lab.smoke.mjs`.
- Docs: README, SPEC, architecture, audit, roadmap.
- No image data in the document.
- No even-odd fill or nested contour hierarchy.

## Non-goals

- No even-odd filled holes.
- No contour nesting tree UI.
- No change to the largest-contour default.
- No new segmentation algorithm.
