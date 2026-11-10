## Why

Render passes are the bridge between typed evaluated geometry and the p5-like
or SVG draw contexts. They were the last untyped drawing code and each pass
repeated the same loose assumptions about curves, meshes, styles and analysis.

## What Changes

- Add `render/passes/types.ts` with the shared pass context, curve, mesh,
  style, view, analysis and document contracts.
- Convert `core`, `gradient`, `vectors`, `fields`, `epicycles` and `surface`
  passes to `.ts`.
- Keep the JS compatibility re-exports.
- Point the pass index and internal imports at the `.ts` modules.

## Out of Scope

- `P5Adapter`, `ProductPreview`, UI panels and pass behavior changes.
