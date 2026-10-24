## 1. Document and engine

- [x] 1.1 Add v3 schema, defaults, sanitization and v2 migration.
- [x] 1.2 Evaluate layers independently with global budgets and layer-aware errors.
- [x] 1.3 Aggregate descriptor and preserve per-layer descriptors.
  - Verify: migration, isolation, aggregate curves/metrics, budget tests.

## 2. UI

- [x] 2.1 Layer list + add/remove/reorder/visibility/lock/select.
- [x] 2.2 Bind generator/operator/style editors to the selected layer.
- [x] 2.3 Keep notebook/AI descriptors layer-aware.
  - Verify: e2e two-layer composition.

## 3. Export

- [x] 3.1 SVG groups per layer with style; hidden layers omitted.
- [x] 3.2 PNG composition.
- [x] 3.3 Round-trip v3 JSON.
  - Verify: golden SVG/JSON + e2e.

## 4. Verification

- [x] 4.1 Full test/build/e2e.
- [x] 4.2 Update docs/roadmap.
- [x] 4.3 Validate and archive.

## Verification results

- `npm test`: **820/820 checks** (group 19 added).
- `npm run build`: succeeds; bundle warning unchanged.
- `npm run test:e2e`: **41/41 tests**, including layer add/style/hide/reorder.
- `openspec change validate composition-layers`: valid.
