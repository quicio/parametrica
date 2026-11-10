## Types

- `Renderer` backend contract.
- `Palette`, `CustomPalette`, `StoredPalette`, `ArtboardPreset`,
  `PaletteStore`.
- `StoredLook`, `LookSaveResult`, `LookPresetStore`.
- `TraceFillGroup`, `ReferenceContext`, `ThumbnailOptions`.
- `FillContext`, `GradientSpec`, `ProjectedPoint`, `ProjectedCurve`.

## Rules

- Helpers stay DOM-light; thumbnails are the only browser-canvas module.
- p5-like and SVG contexts are structural, not concrete adapter imports.
- Storage goes through `StorageLike`.
- Projection/fill/reference output is unchanged.

## Verification

- `tsc --noEmit`, Node, arch and e2e gates pass.
- SVG/PNG thumbnails, palettes, looks and orthographic projection behave
  unchanged.
