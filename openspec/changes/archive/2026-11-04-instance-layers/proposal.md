## Why

Layers already compose independent figures, but they cannot reuse a shared
parametric source. Users who want variations of one surface must duplicate the
generator and manually keep parameters in sync.

A full composition system would introduce a second scene graph and duplicate
the current layer model. The narrow need is a layer that references another
generator layer and derives transformed copies.

## What Changes

- Add `type: 'generator' | 'instance'` to layers.
- Add instance layers with `source.layerId`, own operators, style, visibility
  and order.
- Instances reference generator layers only; no instance chains or cycles.
- Allow changing the source, with full invalidation and re-evaluation.
- Clone canonical world Surface before tessellation; never transform projected
  meshes.
- Allow only topology/orientation-preserving operators in the MVP:
  `translate`, `rotate`, `scale`. Exclude `mirror`.
- Generate deterministic instance `surfaceId`/`meshId` and regenerate
  `SurfaceMapping` from the cloned Surface.
- Evaluate hidden sources only when a visible instance needs them.
- Block deleting a source with dependents and show the dependent count.
- Limit documents to 32 layers and 24 instance layers.
- Add minimal Layers/Instance UI and disable Mutation/Explore/Evolution for
  instances.
- Keep Fabricate single-body with an explicit composition warning.

## Capabilities

### New Capabilities

- `instance-layers`

### Modified Capabilities

- `composition-model`
- `surface-mapping`
- `surface-inspection`
- `fabrication-contracts`

## Impact

- `src/core/document.js`: layer type, source, sanitize/migration, layer limit.
- `src/core/engine.js`: dependency-aware layer evaluation and instance cache.
- `src/geometry/*`: canonical Surface cloning and mapping regeneration.
- `src/interaction/*`: source metadata in picking/inspection.
- `src/ui/Controls.js`, `src/application/App.js`: Layers and Instance UI.
- Tests: unit, integration and e2e.

No renderer pass math, geometry kinds, units or export format changes beyond
optional source metadata.

## Non-goals

- No scene graph or composition workspace.
- No instance of instance or cycles.
- No CSG, caps, repair, fields or multi-body.
- No 3MF.
- No Mesh-only or curve instance sources.
- No mirror in the MVP.
- No implicit `document.generator` resolution.
