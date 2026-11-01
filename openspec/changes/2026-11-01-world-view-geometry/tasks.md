## 1. Geometry contracts and compatibility adapters

- [ ] 1.1 Add `src/geometry/contracts.js` with discriminated `Curve2D`,
      `Curve3D`, `Surface`, `Mesh` and `Solid` data shapes.
- [ ] 1.2 Add type guards and validators in `src/geometry/validate.js`.
- [ ] 1.3 Add `src/geometry/legacy.js` with `fromLegacyCurves()` and
      `toLegacyCurves()` adapters, including `x3/y3/h3` compatibility.
- [ ] 1.4 Keep `evaluateDocument(...).curves` while adding canonical world
      geometry behind it.
- [ ] 1.5 Add contract tests for valid, invalid, empty, closed and degenerate
      geometry.
  - Files: `src/geometry/**`, `src/core/engine.js`, `test/lab.smoke.mjs`.
  - Risk: low; no behavior change.
  - Verify: legacy tests unchanged, contract tests pass.

## 2. World/view separation for spatial generators

- [ ] 2.1 Add `src/view/camera.js` and `src/view/projection.js`; move pinhole
      and orthographic projection out of render/generators.
- [ ] 2.2 Make `helix.generate()` return world `Curve3D` points `{x,y,z}`.
- [ ] 2.3 Make `parametric-3d.generate()` return world `Curve3D` points.
- [ ] 2.4 Keep a compatibility `sample()` path that exposes the current
      projected `x/y` and `x3/y3/h3` until the renderer migration lands.
- [ ] 2.5 Remove `view.camera` from the generation cache key.
- [ ] 2.6 Add tests proving camera changes do not alter world geometry, world
      bbox, world arc length or generator cache.
  - Files: `src/generators/helix.js`, `src/generators/parametric3D.js`,
    `src/core/engine.js`, `src/view/**`, `test/lab.smoke.mjs`,
    `e2e/helix.spec.js`.
  - Risk: high; projection and fit may shift pixels.
  - Verify: Helix presets, camera drag, xy/xz/yz views and golden snapshots.

## 3. 3D operator coherence

- [ ] 3.1 Add `accepts`, `produces` and `space` metadata to operator
      definitions.
- [ ] 3.2 Add a view lane for legacy 2D operators applied to `Curve3D`.
- [ ] 3.3 Add world-space transform support for rotate, scale, mirror and
      array/repeat operators on `Curve3D`.
- [ ] 3.4 Reject incompatible operator/geometry combinations with a keyed
      error; never leave partially updated `x/y/z`.
- [ ] 3.5 Add tests that rotate/mirror/scale survive orthographic projection.
- [ ] 3.6 Represent legacy view-space results as ephemeral view items with
      `space: 'view'`, source world identity and no world mutation.
- [ ] 3.7 Recompute the view lane when switching `3d`, `xy`, `xz` and `yz`;
      verify world geometry is unchanged and cache layers stay separate.
- [ ] 3.8 Add an explicit test that a legacy operator never promotes itself to
      world space and never leaves inconsistent spatial metadata.
  - Files: `src/operators/**`, `src/core/engine.js`, `src/core/registry.js`,
    `src/view/**`, `test/lab.smoke.mjs`, `e2e/helix.spec.js`.
  - Risk: high; legacy screen-space behavior.
  - Verify: 36 operators on Curve2D unchanged; 3D transform tests; projection
    switch tests; orthographic rotation test.

## 4. RenderScene and renderer decoupling

- [ ] 4.1 Add `src/render/scene.js` with `RenderScene`, `RenderLayer`,
      `RenderItem` and style contracts.
- [ ] 4.2 Add `src/application/renderSceneBuilder.js`.
- [ ] 4.3 Add `Renderer` interface and `src/render/p5/P5Adapter.js`.
- [ ] 4.4 Move pointer camera interaction to `src/view/cameraController.js`.
- [ ] 4.5 Move animation clock ownership to `src/application/animationController.js`.
- [ ] 4.6 Port the 12 render passes to RenderScene data.
  - Files: `src/render/**`, `src/application/**`, `src/view/**`,
    `src/ui/Controls.js`.
  - Risk: high; visual and interaction regressions.
  - Verify: all render passes, overlays, camera drag, wheel zoom, animation,
    thumbnails, PNG capture.

## 5. Typed pipeline and world analysis

- [ ] 5.1 Validate geometry kind between pipeline stages.
- [ ] 5.2 Add world-space `Curve3D` analysis: length, bbox, curvature/torsion
      where implemented.
- [ ] 5.3 Separate world analysis from screen-space overlay analysis.
- [ ] 5.4 Compute spatial descriptors from world geometry.
- [ ] 5.5 Keep a compatibility descriptor path until accepted.
- [ ] 5.6 Fix per-layer cache boundaries.
- [ ] 5.7 Define in-process cache interfaces and keys for World Geometry,
      World Analysis, View Projection and Render.
- [ ] 5.8 Ensure World Geometry keys exclude camera, projection, fit, viewport
      and styles.
- [ ] 5.9 Ensure World Analysis invalidates only when world geometry changes.
- [ ] 5.10 Ensure View Projection keys include world identity, camera,
      projection mode, fit and viewport dependencies.
- [ ] 5.11 Ensure Render keys include styles, overlays, render passes and
      presentation config.
- [ ] 5.12 Add cache isolation tests by document and layer, including
      multi-layer recursive evaluation.
- [ ] 5.13 Add cache-on vs cache-off equivalence tests and partial upstream
      reuse tests for generator/operator edits.
  - Files: `src/core/engine.js`, `src/application/**`, `src/view/**`,
    `src/render/**`, `src/analysis/**`, `src/geometry/analysis.js`,
    `src/lab/descriptor.js`, tests.
  - Risk: medium; stale or over-invalidated results.
  - Verify: camera-only change, viewport/fit change, generator edit, operator
    edit, layer isolation, cache equivalence, visual-only change.

## 6. Surface, Mesh and Solid contracts

- [ ] 6.1 Add `Surface` grid contract and validator.
- [ ] 6.2 Add `Mesh` vertices/faces/normals/uvs contract and validator.
- [ ] 6.3 Add `Solid` boundary/shells/volume contract and validator.
- [ ] 6.4 Define relation adapters: lift Curve2D→Curve3D, Surface→Mesh,
      Mesh→Solid.
- [ ] 6.5 Add structural tests; do not add authoring features yet.
- [ ] 6.6 Implement solid validation checks for watertight edges, edge-face
      consistency, orientation, degenerate faces and optional
      self-intersections.
- [ ] 6.7 Require a validation record for Mesh→Solid; reject `closed: true`
      supplied without validation.
- [ ] 6.8 Add volume consistency checks when signed volume is computable and
      record unsupported checks explicitly.
  - Files: `src/geometry/**`, tests.
  - Risk: low if no UI/export is exposed.
  - Verify: contract tests plus open, non-manifold, degenerate, self-intersecting
    and closed-manifold fixtures.

## 7. Fabrication export boundaries

- [ ] 7.1 Define `GeometryExporter` interface and export context.
- [ ] 7.2 Keep SVG/PNG exporters consuming RenderScene/2D view.
- [ ] 7.3 Define STL/3MF adapter contracts for `Mesh`/`Solid`; do not implement
      file output yet.
- [ ] 7.4 Define unit and tolerance conventions in metadata.
  - Files: `src/export/**`, `src/geometry/**`, docs.
  - Risk: low; contracts only.
  - Verify: architecture tests and docs.

## 8. Module moves and cleanup

- [ ] 8.1 Move `core/App.js` to `application/App.js` and keep core DOM-free.
- [ ] 8.2 Move legacy `geometry/CatmullRom`, `MasterSpline`, `Mirror`,
      `OpticalCorrection` under `geometry/legacy/` or document their legacy
      status.
- [ ] 8.3 Update imports and architecture docs.
- [ ] 8.4 Add a dependency-direction test for `core`, `geometry`, `view`.
  - Files: `src/**`, docs, tests.
  - Risk: medium; import churn.
  - Verify: lint, unit, build, no cycles.

## 9. Verification and release gate

- [ ] 9.1 Full `npm run check`.
- [ ] 9.2 Full Playwright suite.
- [ ] 9.3 Golden snapshots for Helix, camera views and orthographic views.
- [ ] 9.4 Verify document v3, presets, notebook, session and history round-trips.
- [ ] 9.5 Verify SVG/PNG output and camera interaction.
- [ ] 9.6 Validate OpenSpec and archive after acceptance.

## Acceptance criteria

- Rotating the camera does not evaluate generators or change world metrics.
- `helix` and `parametric-3d` preserve their parameters, presets and visual
  behavior in all four view modes.
- `Curve3D` world coordinates are the canonical spatial output.
- 3D affine operators update world coordinates coherently.
- Legacy view-space operators never mutate world geometry and remain
  deterministic across `3d`, `xy`, `xz` and `yz`.
- Camera, projection, fit and viewport changes invalidate only their downstream
  caches.
- Cache-on and cache-off evaluation are equivalent.
- `P5Renderer` does not import `App` or mutate the document.
- Document v3, 36 operators, 12 render passes, notebook and presets remain
  compatible.
- Surface, Mesh, Solid and STL/3MF contracts exist and are validated even
  though the authoring features are not yet implemented.
- `Solid.closed` is derived from topological validation and cannot be supplied
  by a caller as sufficient evidence.

## Verification results

Pending implementation.
