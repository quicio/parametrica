## Why

The fabrication preview currently renders the prepared lattice mesh with a
depth-banded p5 pass: no normals, no directional light, no shadows, no
ambient occlusion and no material finish. It is a useful technical check, but
it cannot answer the product question: does the fabricated piece work as an
organic sculpture?

The current `RenderScene` is artboard-space 2D. A true PBR backend needs the
same prepared mesh in world space, the camera, the layer identity and a
material contract. Rebuilding a separate scene inside a second renderer would
risk Preview/Fabricate divergence.

This change accepts the cost of a second renderer, but keeps it behind the
existing scene contract and the existing prepared mesh.

## What Changes

- Add an optional WebGL/PBR preview layer.
- Extend `RenderScene` with a `spatial` sidecar: world meshes, camera,
  projection, layer visibility/opacity and preview material.
- Add `PreviewMaterialSpec` and `PreviewLightingSpec` as view-level
  presentation settings, separate from `finishQuality`.
- Add product material presets (clay, ceramic, matte) and a procedural studio
  light rig.
- Add directional key/fill/rim light, shadow maps, contact/ground shadow and
  optional screen-space AO.
- Add a `Technical / Product` preview toggle in Fabricate.
- Use the exact prepared mesh that Fabricate would export; do not rebuild the
  lattice for the PBR path.
- Lazy-load the backend and its dependency; do not grow the initial bundle.
- Fall back explicitly to p5 when WebGL is unavailable or the context is lost.
- Keep technical overlays, picking, SVG/plotter and STL/3MF export on p5.

## Out of Scope

- No replacement or removal of the p5 renderer.
- No change to geometry, LatticeSpec, fabrication validity or export bytes.
- No PBR material authoring in the document geometry.
- No full parity for guides, coordinates, seams, inspection or selection
  overlays in the PBR backend; those stay technical.
- No HDRI asset pipeline in the first slice; use a procedural studio rig.
- No product-render image export in this slice; preview capture remains p5
  unless a separate change is approved.
- No mobile-specific backend or native renderer.

## Dependencies

- `render-scene-separation`, `world-view-separation`, `fabrication-contracts`,
  `fabrication-worker`, `lattice-solid-preview`.
- `2026-11-06-lattice-refinement` for the mesh and opening evidence that the
  preview is meant to evaluate.
- `bundle-performance` for lazy-chunk and initial-load budgets.

## Impact

- `src/render/Renderer.js`: backend contract remains the same.
- New `src/render/webgl/` adapter and material/lighting modules.
- `src/application/renderSceneBuilder.js`: spatial sidecar.
- `src/application/App.js`: backend selection, lifecycle and fallback.
- `src/ui/sections/lookSections.js` or a dedicated Product preview section.
- `src/core/document.js`: optional sanitized view-level preview settings.
- `package.json`: one lazy-loaded rendering dependency, if approved.
- Tests, bundle checks, performance benchmarks and visual evidence.

## Open Questions

1. Three.js versus raw WebGL. Recommendation: Three.js, lazy-loaded in a
   dedicated chunk, because PBR materials, shadows and color management are
   otherwise a large custom engine.
2. Should Fabricate default to Product preview when WebGL is available, or keep
   Technical as the default with an explicit toggle? Recommendation: explicit
   toggle first; promote to default only after visual and performance gates.
3. Is screen-space AO required for the first slice, or is shadow + depth
   occlusion enough? Recommendation: shadow and contact shadow first; AO only
   in `high` preview quality.
4. Do preview materials persist in the document view or only in session/local
   storage? Recommendation: view-level persisted, sanitized, no geometry
   impact.
5. Should product-render PNG export be a later slice? Recommendation: yes,
   separate change.
