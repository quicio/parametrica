## 1. Parametric surface generator

- [x] 1.1 Add `src/generators/parametricSurface.js` with `x(u,v)`, `y(u,v)`,
      `z(u,v)` expressions and a default torus-like surface.
- [x] 1.2 Add U/V domains, `samplesU`, `samplesV`, `closedU`, `closedV` and
      `fit` parameters.
- [x] 1.3 Return world `Surface` geometry using the approved `points[u][v]` and
      seam convention.
- [x] 1.4 Register `geometryKind: 'surface'` capability and validate the
      generator definition.
- [x] 1.5 Keep the generator camera-free and render-free.
  - Files: `src/generators/parametricSurface.js`, `src/generators/index.js`,
    `src/core/registry.js`, tests.
  - Risk: medium; new model and grid size.
  - Verify: torus/plane defaults, U/V resolution, closure flags, expression
    errors.

## 2. Surface validation and analysis

- [x] 2.1 Validate rectangular grids, finite points, domains and row/column
      seam sizes.
- [x] 2.2 Add surface bbox3 and approximate triangle area analysis.
- [x] 2.3 Include surface metrics in evaluation results without changing curve
      metrics.
- [x] 2.4 Add cache boundaries for Surface generation and analysis.
  - Files: `src/geometry/validate.js`, `src/geometry/analysis.js`,
    `src/core/engine.js`, tests.
  - Risk: medium; cache correctness and mixed geometry.
  - Verify: invalid grid fixtures, torus area, camera-independent metrics.

## 3. Surface tessellation

- [x] 3.1 Add `src/geometry/surfaceTessellation.js` with deterministic grid
      triangulation.
- [x] 3.2 Implement consistent winding, face normals and area-weighted vertex
      normals.
- [x] 3.3 Handle duplicated seam rows/columns via index welding.
- [x] 3.4 Add a mesh cache keyed by surface identity and tessellation options.
- [x] 3.5 Add closed/open U/V tessellation tests and degenerate-grid tests.
  - Files: `src/geometry/surfaceTessellation.js`, `src/geometry/relations.js`,
    tests.
  - Risk: high; seam cracks, inverted normals, triangle count.
  - Verify: triangle count formula, normals unit length, closed torus seam.

## 4. View projection for surfaces and meshes

- [x] 4.1 Add `projectWorldMeshes`/`projectMesh` to `src/view/projection.js`
      (`projectSurface` kept as a documented passthrough).
- [x] 4.2 Project camera depth and orthographic axes without mutating world
      geometry.
- [x] 4.3 Apply fit/centering to projected vertices only.
- [x] 4.4 Add projection tests for `3d`, `xy`, `xz`, `yz`.
  - Files: `src/view/projection.js`, tests.
  - Risk: medium; coordinate conventions.
  - Verify: camera change does not alter world mesh; orthographic axes.

## 5. RenderScene mesh items

- [x] 5.1 Extend `src/render/scene.js` with projected mesh items.
- [x] 5.2 Extend `renderSceneBuilder` for surface/mesh layers and mixed
      curve/mesh scenes.
- [x] 5.3 Add `surface-fill` render pass with painter-sorted triangles.
- [x] 5.4 Add `surface-wireframe` render pass.
- [x] 5.5 Keep `stroke` for curve polylines and preserve layer styles.
- [x] 5.6 Document painter-order limitations; no z-buffer.
  - Files: `src/render/scene.js`, `src/application/renderSceneBuilder.js`,
    `src/render/p5/P5Adapter.js`, `src/render/passes/**`, tests/e2e.
  - Risk: high; visual quality and performance.
  - Verify: torus fill/wireframe, depth order, mixed curve/surface layer.

## 6. UI and document compatibility

- [x] 6.1 Expose `Parametric Surface` in the generator selector through normal
      registry discovery; no custom panel branch.
- [x] 6.2 Keep document v3, preset, notebook, session and history formats
      unchanged.
- [x] 6.3 Ensure existing 23 curve generators, 36 operators and 12 curve render
      passes continue working (plus the 2 new surface passes).
- [x] 6.4 Verify layer styles, export SVG/PNG and artboard fit.
  - Files: UI discovery only, document, export, tests.
  - Risk: medium; mixed geometry render.
  - Verify: existing e2e suite plus new surface e2e.

## 7. Analysis and descriptor compatibility

- [x] 7.1 Expose surface area/bbox/closure through world analysis.
- [x] 7.2 Keep curve descriptor fields unchanged.
- [x] 7.3 Extend the world descriptor with `surfaceCount`/`meshCount` and
      `area`; curve fields stay unchanged.
- [x] 7.4 Add cache-on/off equivalence tests for surfaces.
  - Files: `src/lab/descriptor.js`, `src/geometry/analysis.js`, tests.
  - Risk: medium; descriptor comparisons.
  - Verify: world metrics stable under camera changes.

## 8. Verification and release gate

- [x] 8.1 `npm run check`.
- [x] 8.2 Full Playwright suite.
- [x] 8.3 Use the new generator to create a torus, a plane and an open patch.
- [x] 8.4 Validate OpenSpec and archive after acceptance.

## Acceptance criteria

- `parametric-surface` produces a world `Surface` independent of camera.
- U/V resolution and closure flags deterministically control the grid.
- `Surface → Mesh` is deterministic, indexed, consistently wound and has
  normals.
- Camera changes do not regenerate the surface, tessellate the mesh or alter
  world metrics.
- Surfaces render as wireframe and painter-sorted fill through p5 without
  Three.js or a z-buffer.
- Existing curve documents, presets, notebook, session and export remain
  compatible.
- No solids, CSG or STL/3MF implementation is introduced.

## Verification results

- `npm run check` (lint + node suite + build): pass.
- `npm test`: 1400/1400 checks across 30 groups, including the new
  `30. parametric surfaces` group.
- `npm run test:e2e`: 72/72 Playwright tests, including
  `e2e/surface.spec.js` (generate, tessellate, enable Surface Fill, canvas
  changes).
- `openspec validate --changes`: pass.
- Default torus (64×32 cells): 2048 welded vertices, 4096 triangles, 2048 unit
  vertex normals, 4096 face normals; approximate area 78.751 vs. analytic
  78.957.
- Open patch (8×10 cells, both axes open): 80 vertices, 126 triangles.
- Surface generation, world analysis and wireframe curves are camera-free:
  `geometry`, `meshes` and `worldAnalysis` are reused across camera changes;
  only `renderMeshes` and projected curves change.

## Known limitations (accepted for this slice)

- `evaluateSurfaceDocument` ignores existing curve operators; surface-specific
  operators are deferred.
- `surface-fill` uses approximate painter ordering by average depth. There is
  no z-buffer, clipping or lighting.
- SVG export emits the surface wireframe compatibility curves, not filled
  triangles. PNG export captures the rendered p5 canvas, including fills.
- The default view mode is `stroke`, so a new surface document initially shows
  the wireframe curves; enable Surface Fill or Surface Wireframe explicitly.
