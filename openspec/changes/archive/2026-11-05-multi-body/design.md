## Context

`resolveFabricationSource` selects the first valid closed Mesh/Solid from the
active layer. `mergeMeshes` can concatenate meshes with index offsets, and
validation now rejects self-intersections.

## Decisions

### D1: Scope

```js
view.fabrication = {
  ...,
  scope: 'single' | 'active-layer' | 'composition',
}
```

- `single`: first valid body from the active layer (default, existing behavior).
- `active-layer`: all valid bodies from the active layer.
- `composition`: all valid bodies from visible layers.

Hidden layers are excluded from composition scope. The active layer is still
used for single/active-layer scope.

### D2: Independent validation

Each selected body is validated before merging. A body that is open,
non-manifold, self-intersecting or has invalid volume is excluded from the
multi-body set. If no valid body remains, export stays disabled.

### D3: Merge

Valid bodies are converted to boundary meshes and concatenated with
`mergeMeshes` (no automatic weld). The merged mesh is validated again. This
second gate catches overlapping shells: they remain individually valid but
self-intersect when combined. Multi-body export therefore means separate,
non-overlapping shells; it is not a union.

### D4: Report and UI

The report exposes `scope`, `multiBody`, `bodies` and merged triangle/vertex/
volume values. Fabricate shows a scope selector and a **Bodies** row. The reason
line states `N disjoint bodies` or `single body`.

### D5: Export

STL writes one mesh containing all merged shells. No 3MF and no per-body
metadata. If the merged validation fails, no bytes are written.

## Risks / Trade-offs

- Overlapping bodies are rejected rather than unioned.
- Composition export depends on visible layers only.
- Merged shells share one STL body count but remain distinct topologically.
