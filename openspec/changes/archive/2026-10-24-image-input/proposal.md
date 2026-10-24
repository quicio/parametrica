## Why

Users want to bring a silhouette or reference from outside. The math workbench
can accept it without becoming a raster editor: use the image as an underlay
and optionally convert a high-contrast contour into a Fourier document.

## What Changes

- Add image upload, underlay opacity/scale/position/rotation.
- Add threshold preview and largest-contour extraction.
- Convert the contour to Fourier harmonics and create an editable `fourier`
  document.
- Document explicitly the single-contour limitation.
- Add synthetic-image and e2e tests.

## Capabilities

### New Capabilities

- `image-input-panel`: underlay reference, contour extraction and Fourier
  tracing.

### Modified Capabilities

- None. `image-input` is a new future capability; this change defines its first
  implementation.

## Impact

- new `src/input/imageTrace.js`, `src/ui/widgets/ImagePanel.js`
- `src/generators/fourier.js` (reuse), document creation
- tests + e2e + docs

## Non-goals

- No photographic segmentation.
- No multi-contour/holes in v1.
- No server upload.
- No color/gradient tracing.
