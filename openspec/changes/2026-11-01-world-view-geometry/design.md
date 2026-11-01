## Decisions

### D1: World geometry is canonical; camera is view-only

Generators that produce spatial geometry MUST return world coordinates. They
MUST NOT read `document.view.camera`, call the pinhole projection or attach
screen-space `depthAlpha`.

`helix` and `parametric-3d` keep their ids and parameters but move from
`sample() → projected Curve[]` to `generate() → Curve3D[]`. A compatibility
adapter exposes legacy `x3/y3/h3` and projected `x/y` to the current renderer
until the renderer migration lands.

### D2: `fit` and centering are presentation, not generation

World geometry must not change when the camera or artboard changes.

`fit`, viewport centering and artboard scaling move to a normalization / view
stage. During migration, the legacy fit behavior is reproduced by the
compatibility adapter so golden images remain stable.

### D3: Discriminated unions, not class hierarchies

Geometry is represented by plain data with an explicit `kind`:

```js
{ kind: 'curve2d', dimension: 2, ... }
{ kind: 'curve3d', dimension: 3, ... }
{ kind: 'surface', dimension: 3, ... }
{ kind: 'mesh', dimension: 3, ... }
{ kind: 'solid', dimension: 3, ... }
```

Each kind has a validator and type guard. No `Geometry` base class.

### D4: `Curve3D` uses world coordinates

Canonical point:

```js
{ x, y, z }
```

Legacy `x3/y3/h3` are produced only by the compatibility adapter. `depth` and
`depthAlpha` belong to the render layer, never to world geometry.

### D5: Surfaces are evaluated grids; meshes are indexed geometry

```js
Surface {
  kind, id, domain: { u, v, closedU, closedV },
  grid: { rows, cols, points: Point3D[][] },
  meta
}

Mesh {
  kind, id, vertices: Point3D[], faces: number[][],
  normals?, uvs?, meta
}

Solid {
  kind, id, boundary: Mesh, shells?: Mesh[],
  closed,                  // derived from validation, never a caller hint
  volume?,
  validation: {
    closed, manifold, oriented,
    degenerateFaces, selfIntersections?,
    volumeConsistent?, tolerance
  },
  meta
}
```

A Mesh becomes a Solid only after topological validation. A `closed` flag
alone is not evidence of a solid.

A parametric definition lives in the document; evaluated geometry is derived
and never persisted.

### D6: Operators declare type and space

```js
{
  accepts: ['curve2d' | 'curve3d' | 'surface' | 'mesh' | 'solid'],
  produces: [...],
  space: 'world' | 'view',
}
```

- `world` transforms geometry coordinates.
- `view` transforms projected render coordinates.
- Existing 2D operators remain valid on `Curve2D`.
- Existing 2D operators used on `Curve3D` enter a temporary `view`
  compatibility lane, preserving current screen-space behavior without
  leaving stale `x3/y3/h3`.
- New 3D transforms operate in world space and update `x/y/z` consistently.
- The space is declared, never inferred by mutating geometry at runtime.
- A view-space result is an ephemeral render/view item carrying
  `space: 'view'` and the source world-geometry identity. It is not persisted,
  not used for world analysis and recomputed when projection changes.
- Within each lane, document order is preserved. World operators run before
  projection; view operators run after projection. A mixed stack therefore has
  a deterministic two-lane order.

### D7: RenderScene is the renderer boundary

The renderer receives a prepared scene, not the document:

```js
RenderScene {
  kind: 'render-scene',
  artboard,
  view: { projection, camera, guides },
  layers: [{ id, style, items: RenderItem[] }],
  overlays,
}
```

Initial `RenderItem`: `polyline`. Future items: `triangles`, `surface-grid`,
`wireframe-mesh`.

### D8: P5 is an adapter, not the application

`P5Renderer` implements:

```txt
Renderer.mount(container)
Renderer.resize(w, h)
Renderer.render(scene)
Renderer.capture(format)
Renderer.destroy()
```

It MUST NOT import `App`, read business state, mutate camera or advance time.

### D9: Camera and animation are controllers

- `CameraController` translates pointer/wheel input into view commands.
- `AnimationController` owns play/pause/speed/time and emits time.
- `ProjectionService` maps world geometry and `ViewState` into RenderScene.
- Changing the camera rebuilds the scene only; it never evaluates generators.

### D10: World pipeline order

```txt
Document
  → Generator.generate()            world geometry
  → world operators                 world geometry
  → normalize / validate            consistent geometry
  → world analysis                  world metrics
  → projection                      RenderScene
  → view operators (legacy)         RenderScene
  → render passes                   p5 / future backend
  → exporters                       SVG/PNG now, STL/3MF later
```

Sampling, tessellation and meshing belong to geometry/generation.
Projection and fit belong to view.
Render passes contain no mathematical generator logic.

### D11: Compatibility lane, no document migration

- Document v3, layers, preset JSON, notebook JSON, session and history remain.
- `evaluateDocument` continues to return `curves` for legacy consumers and
  adds canonical world geometry behind it.
- All 23 generator ids and all 36 operator ids remain.
- 12 render passes keep working from projected polyline scene items.
- `x3/y3/h3` remain available through an adapter for existing tests and
  consumers during migration.

### D12: World-space metrics

For spatial geometry, arc length, bounding box, world analysis and descriptors
come from world geometry. Camera changes must not alter them. The compatibility
descriptor can remain screen-space only until the world descriptor lands.

### D13: Fabrication contracts are defined now, implemented later

Mesh and Solid validation and export adapters are specified but not delivered
in this change. STL/3MF consume `Mesh`/`Solid` in world coordinates and never
use the renderer.

### D14: Module moves follow responsibility

```txt
core/App.js                  → application/App.js
render/camera3d.js           → view/camera.js
render/projection.js         → view/projection.js
camera drag in P5Renderer    → view/cameraController.js
animation clock in P5Renderer→ application/animationController.js
scene assembly in P5Renderer → application/renderSceneBuilder.js
geometry v1 helpers          → geometry/legacy/
```

No empty future folders. New modules are created only when their contracts and
tests exist.

### D15: Dependency direction

```txt
UI               → Application, ViewState
Application      → Pipeline, Geometry, View, Render, Persistence
Pipeline         → Geometry, Sampling, Analysis, Math
Generators       → Geometry, Sampling, Math
Operators        → Geometry, Analysis, Math
View             → Geometry, Math
Render           → View, RenderScene, RenderPasses
Export           → Geometry, View, RenderScene
Core runtime     → no UI, no p5
```

`application/App.js` is the only composition root allowed to import UI.

### D16: Four independent caches

The pipeline owns four cache boundaries. They are separate because their
inputs and invalidation rules differ:

| Cache | Key includes | Must not include |
|---|---|---|
| World Geometry | generator/operator params, seed, time inputs, geometry kind, algorithm version | camera, projection, fit, viewport, styles |
| World Analysis | world geometry identity/content, analysis version | camera, projection, fit, viewport, styles |
| View Projection | world geometry identity/content, camera yaw/pitch/FOV, projection mode, fit, viewport | document/notebook/UI state |
| Render | view projection result, styles, overlays, render passes, presentation config | generator/operator math |

Camera and viewport changes invalidate projection/render only. Generator
changes invalidate their downstream entries. Operator changes reuse the
longest valid upstream prefix. Entries are isolated by document and layer.
No external cache library is required.

## Component diagram

```txt
UI
 │
 ▼
Application
 ├─ DocumentService / NotebookService / PresetService
 ├─ GeometryService
 ├─ RenderSceneBuilder
 └─ ExportService
 │
 ├──────────────┬──────────────┬──────────────┐
 ▼              ▼              ▼              ▼
State         Pipeline        View           Render
DocumentStore Generate        CameraState    Renderer iface
ViewStore     World operators Projection     P5Adapter
Workspace     Normalize       Viewport       RenderPasses
UI state      Analysis        CameraController
              Validate        AnimationController
 │
 ▼
Geometry
Curve2D · Curve3D · Surface · Mesh · Solid
```

## World / view / render boundary

| Concern | World | View | Render |
|---|---:|---:|---:|
| Coordinates | x/y/z world | projected x/y | screen x/y |
| Camera | no | yes | reads scene only |
| Depth | no | computed | alpha / future z |
| Fit | optional world normalization | viewport fit | no |
| Analysis | world | screen-specific overlays | no |
| Operators | world lane | view lane | no |
| Persistence | document only | view state in document | never |

## Compatibility strategy

1. Add contracts and a `toLegacyCurve()` adapter without changing behavior.
2. Move 3D projection out of generators behind a feature-tested adapter.
3. Introduce `world` / `view` operator lanes; legacy 3D screen operations stay
   in the view lane.
4. Decouple `P5Renderer` through RenderScene while preserving pixel output.
5. Move world analysis/descriptor after the renderer is stable.
6. Add surface/mesh/solid contracts only after curve contracts are proven.

## Risks

- **Visual regression from moving fit/projection.** Mitigate with golden
  snapshots of Helix presets, camera views and orthographic views.
- **Operator compatibility.** Mitigate with an explicit view lane and type
  errors, never partial 3D metadata mutation.
- **Cache correctness.** Camera must leave the generation cache key; layer
  evaluation needs its own cache boundary.
- **Descriptor migration.** World descriptors differ from current projected
  descriptors; keep a compatibility mode until accepted.
- **Over-engineering.** Do not build mesh/solid pipelines before curve
  contracts pass.

## Alternatives rejected

- **Keep projection inside generators and synchronize metadata afterwards.**
  Rejected: world geometry would still depend on the camera.
- **Adopt Three.js now.** Rejected: does not solve contracts and increases the
  migration surface.
- **Rewrite all operators for 3D immediately.** Rejected: high regression risk;
  use world/view lanes.
- **Persist derived geometry.** Rejected: duplicate state, migrations and
  notebook bloat.
- **Bump document to v4.** Rejected: unnecessary; document stores intent, not
  derived geometry.
- **Class hierarchy for geometry.** Rejected: simple data + validators are
  enough.
