## Why

The world/view foundation now provides `Surface` and `Mesh` contracts, world
generators, view projection, RenderScene, validated solids and fabrication
export boundaries. The next step is to produce and display parametric surfaces
without breaking any existing curve workflow.

This slice introduces the first real surface authoring path:

- `x(u,v)`, `y(u,v)`, `z(u,v)` evaluation;
- deterministic surface grids;
- tessellation to indexed meshes with normals and consistent winding;
- projection and rendering of mesh/surface items;
- surface analysis and cache integration.

It does not implement solids, CSG or STL/3MF.

## What Changes

- Add the `parametric-surface` generator with `x(u,v)`, `y(u,v)`, `z(u,v)`,
  U/V domains, resolution and closure flags.
- Produce canonical world `Surface` geometry without camera projection.
- Add deterministic `Surface → Mesh` tessellation with shared vertices, face
  winding, per-vertex normals and optional per-face normals.
- Extend `RenderScene` with triangle/mesh items and add p5 rendering support
  using painter ordering; no Three.js and no z-buffer.
- Add surface projection for camera and orthographic views.
- Extend the world pipeline, analysis and caches to handle `Surface` and
  `Mesh` without affecting curves.
- Preserve document v3, existing presets/notebooks/sessions, all 23 curve
  generators and all 36 curve operators.

## Capabilities

### New Capabilities

- `parametric-surface-generator`: the first surface model and its parameters.
- `surface-tessellation`: deterministic grid-to-mesh conversion and normals.
- `surface-rendering`: RenderScene mesh items and p5 presentation.
- `surface-pipeline`: world generation, validation, analysis and caches.
- `surface-compatibility`: coexistence with current curve documents and UI.

### Modified Capabilities

- None. The existing geometry, view and render contracts remain valid; this
  slice adds surface consumers and producers.

## Impact

- `src/generators/parametricSurface.js` (new)
- `src/geometry/surfaceTessellation.js` (new)
- `src/core/engine.js`
- `src/view/projection.js`
- `src/application/renderSceneBuilder.js`
- `src/render/scene.js`, `src/render/p5/P5Adapter.js`, `src/render/passes/**`
- `src/ui/Controls.js` only for generator discovery/parameters
- tests, e2e, README/architecture/SPEC

## Non-goals

- No solids, booleans, extrusion, revolution, sweep or loft.
- No STL/3MF implementation.
- No Three.js.
- No document v4 migration.
- No new curve operators.
- No textures, PBR, lighting model or z-buffer.
- No redesign of the instrument panel.
