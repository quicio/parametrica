## Why

Image tracing already detects holes, but filled rendering/export still needs an
explicit fill rule and nesting contract. Without it, a hole can render as a
filled island or disappear depending on contour direction.

## What Changes

- Define even-odd fill semantics for traced contours.
- Preserve outer/hole nesting.
- Apply the rule in SVG and raster rendering.
- Keep Fourier layers editable.
- Add synthetic ring/hole tests.

## Out of Scope

- New tracing algorithm.
- Automatic semantic segmentation.
- Changes to Fourier math.
