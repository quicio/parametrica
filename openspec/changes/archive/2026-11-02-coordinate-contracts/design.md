## Context

The engine already separates world geometry from projection, but framing is
applied inside `view/projection.js` and `render/projection.js`, while planar
generators normalize inside `sample()`. The render scene builder also has a
second projection/fit path. The result is multiple sources of truth for the
same artboard coordinate.

## Decisions

### D1: Three spaces, two transforms

`P` is the generator domain, `W` is canonical world geometry, and `A` is the
abstract artboard consumed by backends. The viewport is a chain
`W -> view -> A -> device`, not a fourth authoring space.

### D2: One ViewTransform

`src/view/transform.js` owns the effective camera, projection and frame. The
engine and scene builder use the same implementation. A single effective
camera is resolved per scene/layer and shared by curves and meshes.

### D3: Scene frame

`view.frame.mode` defaults to `scene`: one frame for all spatial layers.
`composition` keeps the legacy per-layer framing. `world` anchors a fixed
scale at the world origin. For a single spatial layer, `scene` produces the
same coordinates as the legacy path.

### D4: Fit is presentation

Generator post-processing no longer applies fit. Planar generators emit raw
polylines; the engine applies `applyPlaneFit` once after sampling. Spatial
geometry is framed by `ViewTransform`. The serialized `generator.params.fit`
remains as a compatibility alias until a future view-frame editor exists.

### D5: Shared mesh framing

`projectWorldMeshes` resolves one camera and one frame across all meshes.
`projectMesh` remains a compatibility helper for a single mesh and keeps the
authored camera for clipping tests.

### D6: Scene is the export contract

Canvas, Quad, SVG and plotter consume `RenderScene`. Exporters do not call
projection or fit. Quad builds one scene per panel; SVG and plotter export the
active single projection and keep the existing warning.

### D7: Reference/UV ready, not implemented

`RenderScene.transform`, `scene.meta.frame` and `Surface.domain` expose the
data a future Spatial Reference or UV inset needs without adding a new space
or a second viewport.

## Risks / Trade-offs

- Multi-layer spatial documents that relied on independent centering now share
  a frame by default. This is the intended spatial fix; `composition` restores
  the old behavior.
- `fit` remains serialized in generator params for compatibility. It is a
  frame hint, not generator math.
- Mixed planar + spatial documents use artboard-space passthrough for planar
  layers; they do not share a spatial frame.
- Painter's algorithm and no z-buffer remain; depth correctness is unchanged.
- Quad remains canvas-only for SVG/plotter.

## Open Questions

- When should the UI expose `view.frame` controls?
- Should mixed 2D/3D layers receive a common plane offset?
- When should `A` gain a physical unit (mm) for fabrication?
