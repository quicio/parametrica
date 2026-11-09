## 1. Contract

- [x] 1.1 Define contour nesting and hole metadata.
- [x] 1.2 Define even-odd fill semantics.
- [x] 1.3 Preserve editable Fourier layers.

## 2. Rendering/export

- [x] 2.1 Add even-odd fill to SVG.
- [x] 2.2 Apply the same rule to raster fills.
- [x] 2.3 Verify plotter unaffected.

## 3. Tests

- [x] 3.1 Synthetic ring/hole fixture.
- [x] 3.2 Nested contour fixture.
- [x] 3.3 E2E image trace + SVG/PNG.

## Acceptance criteria

- Holes render and export as holes.
- Nested contours alternate correctly.
- Fourier layers remain editable.
- No export regression.
