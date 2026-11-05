# Multi-body export

Phase 5C lets Fabricate export several validated closed shells in one STL file.
Single-body export remains the default and is unchanged.

## Scope

`view.fabrication.scope` has three values:

| Scope | Bodies |
|---|---|
| `single` | First valid closed body from the active layer (default) |
| `active-layer` | Every valid closed body in the active layer |
| `composition` | Every valid closed body from visible layers; hidden layers are ignored |

Scope is persisted with the document view like other fabrication settings.

## Validation

1. Each candidate body is validated independently with the same gate used by
   single-body export: closed, manifold, oriented, no degenerate faces, no
   self-intersections and valid volume.
2. Only valid bodies enter the multi-body set.
3. The selected bodies are concatenated with index offsets (no automatic weld).
4. The merged mesh is validated again.

The second validation matters: two individually valid cubes can overlap and
produce a merged mesh with self-intersecting triangles. That merge is rejected.
Multi-body export means **separate shells**, not a boolean union.

## Export

The STL writer receives one mesh containing all shells. The report exposes:

- `scope`
- `multiBody`
- `bodies`
- merged triangle/vertex/volume counts
- the merged validation result

No 3MF, per-body material metadata or overlap resolution is added.

## Fabricate UI

- **Bodies** select: Single body, Active layer, Composition.
- **Body count** row.
- Status: `READY · N bodies` for multi-body sources.
- Reason: `N disjoint bodies`.
- Composition note: separate shells, not a union.

If the merge fails, export stays disabled and the reason identifies the merged
validation error.
