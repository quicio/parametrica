## Types

- `PassContext` extends the fill context with p5-like drawing constants,
  shapes, images and text.
- `PassCurve`, `PassMesh`, `PassPoint`.
- `PassStyle`, `PassView`, `PassAnalysis`, `PassDocument`, `PassData`.
- `PassImage` for the cached signed-distance raster.

## Rules

- Passes remain self-registering side effects.
- Unknown generator parameters and analysis arrays are narrowed locally.
- Draw output and pass ordering are unchanged.
- The SDF cache stays keyed by the curve array identity.

## Verification

- `tsc --noEmit`, Node, arch and e2e gates pass.
- SVG, canvas, gradient, topology, epicycle and surface preview output is
  unchanged.
