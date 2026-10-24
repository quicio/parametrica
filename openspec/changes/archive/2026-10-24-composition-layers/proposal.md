## Why

Every current document has one generator and one operator stack. That is
enough to discover a form, but not to compose a piece. This slice introduces
document v3 layers, per-layer styles and multi-layer rendering/export.

## What Changes

- Add document version 3 with `layers[]`, each with generator, operators, seed
  and style.
- Share view/artboard/animation across layers.
- Add a layer list UI: add/remove/reorder/visibility/lock/select.
- Render layers in order; export all visible layers with their styles.
- Aggregate descriptors across layers and expose per-layer descriptors.
- Migrate v2 documents to a single layer.
- Keep presets and SVG/JSON round-trip compatible.

## Capabilities

### New Capabilities

- `composition-layers-panel`: layer management, multi-layer rendering/export
  and descriptor aggregation.

### Modified Capabilities

- `composition-model`: the implementation realizes its v3 contract; no new
  requirement is needed unless implementation reveals an ambiguity.

## Impact

- `src/core/document.js`, `src/core/engine.js`, `src/lab/descriptor.js`
- `src/render/P5Renderer.js`, `src/export/Exporter.js`
- `src/ui/Controls.js`, layer panel
- `src/presets/builtins.js` migration
- tests + e2e + docs

## Non-goals

- No nested groups or masks in v1 layers.
- No collaborative editing.
- No new generators.
- No animation timeline (next slice).
