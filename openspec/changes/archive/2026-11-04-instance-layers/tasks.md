## 1. Contracts

- [x] 1.1 Add layer `type`, instance `source`, and migration/sanitization.
- [x] 1.2 Add `createInstanceLayer` and the 24/32 layer limits.
- [x] 1.3 Add explicit source resolvers; keep `document.generator` null for
      instances.

## 2. Evaluation

- [x] 2.1 Resolve source/instance dependency order and hidden-source rules.
- [x] 2.2 Clone canonical world Surface and apply allowed instance operators.
- [x] 2.3 Regenerate `SurfaceMapping` and deterministic instance IDs.
- [x] 2.4 Add instance cache/invalidation.
  - Verify: unit tests for migration, canonical cloning, IDs, source change,
    hidden sources, errors, limits and determinism.

## 3. Integration

- [x] 3.1 Add source metadata to picking/inspection and UV/seams consumers.
- [x] 3.2 Preserve render fit/depth params from the source.
- [x] 3.3 Keep SVG/PNG/units/Fabricate single-body behavior.
  - Verify: integration tests for lanes, mapping, picking, scene, exports and
    fabrication.

## 4. UI

- [x] 4.1 Add instance creation, source selector and Layers badges.
- [x] 4.2 Add read-only source params; filter instance operators.
- [x] 4.3 Disable Mutation/Explore/Evolution for instances.
- [x] 4.4 Block deleting referenced sources with a count.
- [x] 4.5 Add Fabricate composition warning.
  - Verify: e2e for creation, source change, propagation, inspection, reload,
    limits and exports.

## 5. Acceptance

- [x] 5.1 Document identity, mapping, evaluation and limitations.
- [x] 5.2 Run `npm run check`, `npm run test:e2e`, strict OpenSpec validation
      and archive.

## Acceptance criteria

- Instance layers reference one generator layer and share its params.
- Source change invalidates and re-evaluates the instance.
- Instances use canonical Surface before tessellation.
- Only translate/rotate/scale are allowed; mirror is rejected in the MVP.
- IDs are deterministic and mapping is regenerated without invented UVs.
- Hidden sources evaluate only for visible dependents.
- Deleting a referenced source is blocked.
- Mutation/Explore/Evolution are disabled for instances.
- Fabricate remains single-body with a visible warning.
- 24 instances / 32 layers are enforced.
