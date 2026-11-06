## 1. Scene contract

- [x] 1.1 Define `RenderScene.spatial` and its world-mesh references.
- [x] 1.2 Carry camera, projection, units, frame and layer identity.
- [x] 1.3 Keep the sidecar optional for existing scenes.
- [x] 1.4 Prove the sidecar references the same prepared mesh, not a rebuild.
- [x] 1.5 Add unit tests for sidecar construction and immutability.

## 2. Backend

- [x] 2.1 Define the lazy ProductPreview controller and its lifecycle.
- [x] 2.2 Add explicit backend selection with p5 as default.
- [x] 2.3 Implement mount, resize, render, destroy and quality changes.
- [x] 2.4 Lazy-load the dependency and adapter.
- [x] 2.5 Implement fallback for missing WebGL2, context loss and init failure.
- [x] 2.6 Keep the animation clock in the existing controller only.
- [x] 2.7 Test backend switching without losing the prepared mesh.

## 3. Appearance

- [x] 3.1 Define and sanitize `PreviewMaterialSpec`.
- [x] 3.2 Add clay, ceramic and matte presets.
- [x] 3.3 Add procedural studio key/fill/rim lighting.
- [x] 3.4 Add directional shadow map and contact/ground shadow.
- [x] 3.5 Add optional screen-space AO behind `high` preview quality.
- [x] 3.6 Separate `previewQuality` from `finishQuality`.
- [x] 3.7 Add material/lighting controls and reset.
- [x] 3.8 Test persistence, clamping and geometry/export invariants.

## 4. Fabricate integration

- [x] 4.1 Add a Technical/Product preview toggle in Fabricate.
- [x] 4.2 Use the fabrication preview mesh directly.
- [x] 4.3 Keep network mode on p5.
- [x] 4.4 Preserve report state, export availability and unit checks.
- [x] 4.5 Show backend, fallback reason and preview quality.
- [x] 4.6 Confirm switching preview does not reschedule the worker.

## 5. Scope boundaries

- [x] 5.1 Keep guides, coordinates, seams and inspection on p5.
- [x] 5.2 Keep SVG, plotter, PNG, STL and 3MF on the existing path.
- [x] 5.3 Explicitly label Product preview as presentation, not printability.
- [x] 5.4 Defer product-render PNG export to a separate change.

## 6. Performance, bundle and visual evidence

- [x] 6.1 Assert the lazy backend is absent from the initial chunk.
- [x] 6.2 Benchmark 15/20/25 mm lattice meshes.
- [x] 6.3 Measure FPS, shadow map, memory and context-loss recovery.
- [x] 6.4 Add visual evidence for clay/ceramic and `Organic Lattice Vase 200`.
- [x] 6.5 Document provisional budgets and fallback thresholds.
- [x] 6.6 Run full gates and update docs/roadmap.

## Acceptance criteria

- Product preview uses the exact prepared fabrication mesh.
- p5 remains default and all technical overlays keep working.
- Switching backend does not change geometry, report state or export bytes.
- WebGL failure/context loss falls back to p5 with a visible notice.
- Material/lighting settings are sanitized, persisted and optional.
- The lazy backend does not enter the initial bundle.
- Existing exports and presets do not regress.
