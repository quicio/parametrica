## Why

The render helpers are shared by the p5 adapter, the WebGL product preview,
the exporter and several UI panels. They were still untyped, and their
p5-like context contracts are the boundary between typed domain geometry and
the concrete renderers.

## What Changes

- Convert `render/Renderer.js` to `.ts` with a typed backend contract.
- Convert `render/palettes.js` to `.ts` with typed artboard presets, palettes
  and the local palette store.
- Convert `render/lookPresetStore.js` to `.ts` with typed user looks and save
  results.
- Convert `render/traceFill.js`, `render/reference.js`, `render/thumbnail.js`,
  `render/fill.js` and `render/projection.js` to `.ts`.
- Keep the JS compatibility re-exports.
- Point internal imports at the new `.ts` modules.

## Out of Scope

- `P5Adapter`, `ProductPreview`, the render passes and UI panels.
- Changing projection, fill, reference, thumbnail or persistence behavior.
