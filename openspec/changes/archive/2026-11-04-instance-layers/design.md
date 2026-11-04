## Context

See `docs/phase-4h-instance-layers-design.md` for the full audit and rationale.
This file records the implementation-facing decisions.

## Decisions

### D1: Layer kinds

Layers persist `type: 'generator' | 'instance'`. Existing documents without a
type migrate to generator. Instance layers persist `source: { layerId }`,
`generator: null`, `seed: null`, own operators/style/visibility. Document
version stays 3.

### D2: Canonical geometry

An instance consumes only `evaluation.geometry` (canonical world Surface), never
`meshes` or `renderMeshes`. It clones the Surface, assigns instance IDs, applies
its allowed operators, then tessellates and regenerates `SurfaceMapping`.

MVP sources must produce Surface; curve and Mesh-only sources are rejected.

### D3: Allowed instance operators

`translate`, `rotate`, `scale`. `mirror` is excluded because current mirroring
does not guarantee consistent winding/normals or STL validity. Topology-changing
operators are rejected with a keyed error.

### D4: Evaluation order

`evaluateLayers` resolves layer IDs, evaluates needed generator sources first,
then instance layers in original layer order. Hidden sources are evaluated only
when a visible instance depends on them. Hidden sources are not rendered.

### D5: Identity

Only `layer.id` and `source.layerId` are persistent. Instance surface/mesh IDs
are derived deterministically:

```text
`${layer.id}:surface:${index}`
`${layer.id}:mesh:${index}`
```

They are stable while source output ordering is stable. They are not
semantically persistent across source topology changes. Source IDs are never
reused.

### D6: Mapping

Mapping is regenerated with `tessellateSurfaceWithMapping` from the cloned
Surface. Domain/grid/cell/UV are preserved by construction. No source mapping
is copied and no UV is invented.

### D7: Cache

Instance cache is keyed by the instance layer object with a signature covering
the source signature and instance operators. Layer objects persist during
normal edits, so a WeakMap is useful; preset/session/import replace objects and
correctly miss. A per-evaluation memo is acceptable if measurement shows the
WeakMap adds no reuse.

### D8: Visibility, locking and deletion

Hidden sources evaluate only for visible dependents. Locking the source does not
block evaluation. Locking an instance blocks editing its operators/style/source.
Deleting a source with dependents is blocked with the count.

### D9: UI

Layers gets `+ INSTANCE` and a source selector. Active instances replace the
generator/params/equations/harmonics sections with a read-only source summary and
the existing operator stack filtered to allowed transforms. Mutation/Explore/
Evolution are disabled for instances. `document.generator` returns null for an
active instance; consumers use an explicit source resolver.

### D10: Fabricate

Single-body from the active layer. Other visible instances are not exported.
The panel states that the composition is not multi-body.

### D11: Limits

Maximum 24 instance layers and 32 total layers. The current 16-layer sanitize
cap must be raised. Over-limit imports remain loadable with a visible warning;
new instance creation is blocked at the limit.

## Risks / Trade-offs

- Many UI modules assume `layer.generator.id`; a central resolver is required.
- Tessellating every instance costs more than one source surface.
- Derived IDs can be reassigned if source topology/order changes.
- Fabricate may disappoint if users expect the whole composition.
- The layer cap change affects presets/session/notebook round-trips.

## Open Questions

None blocking. Cache memo strategy and badge styling are implementation details.
