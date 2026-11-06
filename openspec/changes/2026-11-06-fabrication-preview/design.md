## Context

Verified baseline:

- `src/render/Renderer.js` already defines a minimal backend contract:
  `mount`, `resize`, `render(scene)`, `capture`, `destroy`.
- `P5Adapter` is the only backend. It builds and consumes `RenderScene`
  directly and owns the animation clock.
- `RenderScene` layers contain artboard-space projected curves and meshes.
  `projectWorldMeshesToView` currently discards world `z` and keeps only
  `x`, `y`, `depth` and `depthAlpha`.
- The lattice preview is a depth-banded p5 fill (`lattice-preview` pass); it
  has no normals, lights, shadows or materials.
- `buildRenderScene` already receives the prepared `preview.mesh` and replaces
  the active layer's meshes with that exact mesh. Preview/Fabricate already
  share the prepared body.
- `view.fabrication.finishQuality` is geometric resolution. It is not an
  appearance setting.
- `p5` is already isolated in a build chunk; the initial bundle and lazy-chunk
  behavior are part of `bundle-performance`.

## Architecture

```text
Evaluation + prepared fabrication mesh
        │
        ▼
 buildRenderScene
   ├─ layers: artboard curves/meshes      → P5Adapter (technical)
   └─ spatial: world meshes + camera      → ProductPreview (product)
```

The PBR backend must not call the generator, fabrication source or lattice
builder. It receives the already-prepared mesh and a material/lighting
contract. This preserves the rule that Preview and export share one source.

### Spatial sidecar

```text
RenderScene.spatial = {
  projection: string
  camera: { yaw, pitch, fov, position, target }
  frame: { mode, anchor, fit, scale } | null
  units: { world, mmPerWorldUnit }
  layers: Array<{
    id
    visible
    opacity
    meshes: WorldMesh[]
    material: PreviewMaterialSpec
  }>
  reference: { enabled, ground } | null
}
```

Rules:

- The sidecar references the same world mesh objects used for fabrication; it
  does not clone geometry unless the backend requires it.
- `WorldMesh` is a plain Mesh/Solid boundary with vertices, faces and optional
  normals. The backend computes missing normals locally, without mutating the
  source.
- The sidecar is optional. P5 ignores it and existing scenes continue to work.
- The sidecar must not become a second source of truth for object selection,
  units or fabrication validity.

## Backend contract

```text
ProductPreview backend {
  mount(container)
  resize()
  render(scene)          // consumes scene.spatial
  capture()              // optional; not used by SVG/STL/3MF
  destroy()
  setQuality(quality)    // 'draft' | 'standard' | 'high'
  onContextLost(callback)
}
```

- The backend is selected explicitly by the view/UI. `p5` is the default.
- Switching back to Technical must destroy or suspend the WebGL context and
  restore p5 without losing the prepared mesh.
- WebGL failure, missing WebGL2, context loss or budget exhaustion must show a
  notice and fall back to p5; it must not show an empty canvas.
- The animation clock stays in one place. The PBR backend must not advance
  document time independently.

## Appearance contract

```text
PreviewMaterialSpec {
  version: 1
  id: 'clay' | 'ceramic' | 'matte' | 'custom'
  baseColor: string
  roughness: number
  metalness: number
  clearcoat: number
  sheen: number
  lighting: 'studio' | 'soft' | 'directional'
  shadow: boolean
  contactShadow: boolean
  ao: 'off' | 'screen'
  exposure: number
  background: string | 'transparent'
}
```

- Persisted as an optional view-level setting (proposed
  `view.preview.material`), sanitized and backwards compatible.
- `finishQuality` and `previewQuality` are separate:
  - `finishQuality` controls geometry resolution;
  - `previewQuality` controls shadow-map size, DPR, AO and light samples.
- The material never changes geometry, fabrication validity or export bytes.

## Lighting and shadows

- Key directional light, fill light and rim light. A procedural studio
  environment may provide ambient color without external HDRI assets.
- Shadow map for key light. Resolution is budgeted by preview quality
  (for example 1024/2048/4096, provisional).
- Contact/ground shadow is a separate soft shadow plane; it does not imply a
  printable base or support.
- Optional screen-space AO only in `high` preview quality.
- The lattice has many openings; self-shadowing is expected to be the hardest
  visual case. The benchmark must include `Organic Lattice Vase 200`.

## Scope boundaries

- Product preview is a **view mode**, not a new document mode.
- Technical overlays (guides, coordinates, seams, inspection, picking,
  selection) remain on p5. Product preview supports orbit, zoom, pan and
  material/lighting controls.
- Switching to Product must not change the fabrication report, the prepared
  mesh or the export button state.
- SVG, plotter, PNG, STL and 3MF continue to use the existing technical path.
- A future product-render image export is a separate change.

## Performance and bundle

- The WebGL dependency and adapter must be loaded only when Product preview is
  first requested.
- Initial bundle size must not increase beyond the `bundle-performance`
  budget.
- Provisional targets: 60 fps idle, 30 fps orbit for ~300k triangles at
  `standard` on a laptop; measured, not guaranteed.
- Cap device pixel ratio, shadow map size and AO; degrade to `draft` preview
  quality before falling back to p5.
- Context loss must recover or fall back within one frame budget.

## Testing

- Unit: spatial sidecar construction, material sanitization, backend selection,
  fallback, same-mesh identity.
- E2E: toggle Product, orbit, change material, switch back, export unchanged.
- Visual: screenshot or scene artifact for clay/ceramic and one lattice preset.
  WebGL screenshots in CI may use Chromium SwiftShader; if unstable, keep a
  geometry/contract test and a manual artifact in the PR.
- Performance: benchmark triangles, FPS, shadow map and memory on 15/20/25 mm.
- Bundle: assert the initial chunk does not include the WebGL dependency.

## Acceptance classification

**Functional guarantees**

- Product preview uses the exact prepared fabrication mesh.
- p5 remains available and is the default.
- Switching preview does not change geometry, report state or export bytes.
- WebGL failure/context loss falls back to p5 with a visible notice.
- Material/lighting settings are sanitized and round-trip.
- Initial bundle does not include the lazy backend.

**Quality objectives (provisional)**

- Material, lighting and shadows make openings and silhouette readable.
- No obvious z-fighting, self-shadow acne or material artifacts.
- Orbit performance meets the measured provisional budget or degrades visibly.

**Pending benchmarks / decisions**

- Three.js vs raw WebGL.
- Product default in Fabricate or explicit toggle.
- AO requirement and shadow-map budgets.
- CI screenshot stability under SwiftShader.
- Future PNG product-render export.

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Second renderer drifts from technical preview | High | Same RenderScene and same prepared mesh; no geometry rebuild |
| Bundle grows on first load | High | Lazy chunk and bundle test |
| WebGL unavailable in CI | Medium | Contract tests + fallback test; manual screenshot |
| Lattice self-shadow acne | Medium | Bias, normal offset, budgeted shadow map |
| Material implies printability | High | Keep manufacturing report separate; no material claim |
| Context loss breaks the canvas | Medium | Destroy/fallback to p5 with notice |
| Scope expands to full overlay parity | High | Explicit technical-only boundary |
