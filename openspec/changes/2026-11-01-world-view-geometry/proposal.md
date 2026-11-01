## Why

The Phase 1 audit found that Parametrica already has real 3D coordinates, a
pinhole camera, orthographic views and interactive camera manipulation, but the
boundaries between world geometry, view projection, rendering and application
state are not explicit:

- `helix` and `parametric-3d` call `cameraFrom` / `project3D` inside
  `sample()`, so they emit screen-space `x/y` and world-space `x3/y3/h3`.
- Camera changes invalidate the generation cache and re-evaluate the pipeline.
- Operators mutate `x/y` but preserve stale `x3/y3/h3`, so orthographic views
  can diverge from the camera view.
- The pipeline only knows `Curve[]`; there is no contract for Curve2D,
  Curve3D, Surface, Mesh or Solid.
- `P5Renderer` reads and writes `App` state, owns camera interaction and
  advances the animation clock.
- The renderer, analysis and descriptor work on projected screen geometry,
  not world geometry.

This change defines the target architecture and incremental path required
before surfaces, meshes, solids, STL and 3MF can be added safely.

## What Changes

- Introduce discriminated geometry contracts with explicit kinds and
  validators: `Curve2D`, `Curve3D`, `Surface`, `Mesh`, `Solid`.
- Make world coordinates canonical for spatial generators. Camera projection
  moves to the view layer.
- Preserve legacy `Curve[]` output through an adapter so the current renderer,
  36 operators and 12 passes keep working during migration.
- Define operator `accepts` / `produces` / `space` metadata and a compatibility
  lane for legacy screen-space operators on 3D curves. View-space results are
  ephemeral and survive projection changes without mutating world geometry.
- Formalize independent caches for world geometry, world analysis, view
  projection and render results.
- Define `RenderScene` and a `Renderer` interface so `P5Renderer` no longer
  knows `App`, the document or the animation clock.
- Introduce `CameraController`, `ProjectionService` and
  `AnimationController` as separate responsibilities.
- Define the world pipeline:
  generator → world operators → normalize/validate → world analysis →
  projection → render scene → renderer/exporter.
- Define future Surface/Mesh/Solid and fabrication export contracts without
  implementing those features in this change.
- Keep document v3, layers, presets, notebook, session recovery, history,
  SVG/PNG export and all existing generator/operator ids unchanged.

## Capabilities

### New Capabilities

- `geometry-contracts`: typed geometry data and validation.
- `world-view-separation`: world geometry independent from camera and view.
- `operator-spaces`: type-aware world/view operators and 3D transformation
  coherence.
- `render-scene-separation`: RenderScene, Renderer interface, P5 adapter,
  camera and animation controllers.
- `geometry-pipeline`: ordered geometry pipeline and future surface/mesh/solid
  stages.
- `geometry-compatibility`: legacy Curve adapter, document v3 and existing
  2D/3D behavior.
- `fabrication-contracts`: mesh/solid validation and export boundaries for
  future STL/3MF.

### Modified Capabilities

- `orthographic-projection`: projections consume world Curve3D data rather
  than detector metadata on projected points.
- `lab-notebook`: descriptors for spatial geometry are computed from world
  geometry, not from camera-projected curves.

## Impact

- `src/generators/helix.js`, `src/generators/parametric3D.js`
- `src/core/engine.js`, `src/core/App.js`, `src/core/registry.js`
- `src/render/P5Renderer.js`, `src/render/projection.js`,
  `src/render/camera3d.js`
- new `src/geometry/**`, `src/view/**`, `src/application/**`,
  `src/render/scene/**`
- `src/operators/**` metadata and 3D transform adapters
- `src/lab/descriptor.js`, `src/lab/notebook.js`
- tests, e2e, README/SPEC/architecture

## Non-goals

- Do not implement parametric surfaces, meshing, CSG, solids, STL or 3MF in
  this change. Only define contracts and migration gates.
- Do not replace p5.js.
- Do not introduce Three.js.
- Do not migrate the document to v4 or change preset/notebook formats.
- Do not redesign the UI.
- Do not rewrite all 36 operators at once.
- Do not persist derived geometry.
