## Why

Projection, framing and export were split across generators, the engine, the
scene builder, the p5 adapter and the exporters. Each layer could be centered
independently, multiple meshes were framed per mesh, and SVG/plotter could
re-project instead of consuming the canvas scene. A spatial reference or UV
domain would have multiplied those inconsistencies.

## What Changes

- Add explicit `SPACE` contracts for parameter, world, artboard and device.
- Add `view/transform.js` with one `ViewTransform`, one effective camera and
  one frame resolver.
- Add `view.frame` with `scene`, `composition` and `world` modes.
- Move planar fit out of generator post-processing and into the engine.
- Make `RenderScene` the single artboard-space output for canvas, Quad, SVG
  and plotter.
- Give multiple meshes and layers a shared frame in scene mode.
- Preserve single-layer and planar output; old documents load unchanged.
- Keep physical units, Spatial Reference, UV Domain and CAD out of scope.

## Capabilities

### New Capabilities

- `coordinate-contracts`: explicit spaces, transform, frame and scene parity.

### Modified Capabilities

- None.

## Impact

- New: `src/view/transform.js`, `src/geometry/wireframe.js`.
- Modified: document defaults, engine, view projection, render projection,
  scene builder, scene contracts, p5 adapter, exporter, parametric sampling.
- Tests: `test/lab.smoke.mjs`.
- Docs: README, SPEC, architecture, audit, roadmap.
- Document format adds optional `view.frame`; existing documents receive the
  default frame during sanitization. No version bump.

## Non-goals

- No Spatial Reference, axes, grids or origin overlays.
- No UV Domain inset or UV ↔ XYZ interaction.
- No physical-unit or 3D-printing pipeline.
- No CAD operators or fabrication features.
