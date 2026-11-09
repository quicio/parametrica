## 1. Contract

- [ ] 1.1 Define contour nesting and hole metadata.
- [ ] 1.2 Define even-odd fill semantics.
- [ ] 1.3 Preserve editable Fourier layers.

## 2. Rendering/export

- [ ] 2.1 Add even-odd fill to SVG.
- [ ] 2.2 Apply the same rule to raster fills.
- [ ] 2.3 Verify plotter unaffected.

## 3. Tests

- [ ] 3.1 Synthetic ring/hole fixture.
- [ ] 3.2 Nested contour fixture.
- [ ] 3.3 E2E image trace + SVG/PNG.

## Acceptance criteria

- Holes render and export as holes.
- Nested contours alternate correctly.
- Fourier layers remain editable.
- No export regression.
