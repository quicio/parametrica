## Context

The lattice source is generated inside Fabricate, after the scene has been
built from the authored curves. The renderer already consumes a RenderScene
and a mesh fill pass; the preview injects the prepared mesh into that scene.

## Decisions

### D1: Preview setting

`view.fabrication.latticePreview` is `'network' | 'solid'` and defaults to
`'solid'`. It is sanitized with the fabrication settings but excluded from the
fabrication input key, so toggling does not reschedule the worker.

### D2: Scene injection

`buildRenderScene` accepts an optional `{ mesh, layerId }` preview. It projects
the prepared mesh with the active layer's existing transform and replaces that
layer's meshes and modes. The authored curves stay in the scene metadata; the
preview layer only runs the preview pass.

### D3: Display simplification

The prepared body is ~100k triangles. When the source is dense, the display
mesh is simplified with Manifold (`tolerance 0.35`) and cached by source mesh
identity. Export continues to use `report.source.geometry` unchanged.

### D4: Batched fill

The `lattice-preview` pass groups faces into 48 depth bands and emits one
triangle path per band. This keeps painter order and through-holes while
reducing path setup from ~100k shapes to a few dozen. The pass is internal and
does not appear in the render-mode UI.

### D5: Responsive interaction

While the pointer is dragging or the timeline is playing, the p5 adapter omits
the preview and draws the network, which is an order of magnitude cheaper.
The solid returns on the next idle frame.

## Test matrix

- Network scene has no prepared mesh.
- Solid scene injects one mesh and the `lattice-preview` mode.
- The preview projects every prepared vertex.
- E2E: the select defaults to Solid, toggles to Network and back, and the
  rendered scene follows.
- Export still reports the full source triangle count.
