## Why

The default line is still too heavy for the instrument’s current visual
language, especially in Start With previews and surface wireframes.

## What Changes

- New documents use stroke width `0.5`.
- `view.strokeWeight`, `view.style.stroke.width` and exporter fallbacks use
  `0.5`.
- Existing documents and presets preserve their stored widths.

## Capabilities

### Modified Capabilities

- `artboard-style-panel`: default stroke width is 0.5.

## Impact

- `src/core/document.js`
- `src/export/Exporter.js`
- Default-style unit/e2e assertions
- README and startup documentation

## Non-goals

- No change to stored document widths.
- No style UI changes.
- No geometry, export format or preset semantics change.
