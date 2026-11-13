## Why

The image panel owns local image sources, underlay transforms, threshold
previews and contour → Fourier tracing.

## What Changes

- Convert `ui/widgets/ImagePanel.js` to `.ts`.
- Type image sources/underlays, trace results and app ports.
- Point the ingest-port architecture check at the typed module.
- Keep the JS compatibility re-export.

## Out of Scope

- Timeline panel, sections and Controls.
