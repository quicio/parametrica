## Why

Fabricate currently exports only the first validated closed body. Instances and
layered compositions can contain several valid closed shells, and users have no
explicit way to export them together. Phase 5C adds multi-body export without
implying CSG or a watertight union.

## What Changes

- Add `view.fabrication.scope`: `single`, `active-layer` or `composition`.
- Keep `single` as the default.
- Validate every selected body independently before merging.
- Merge shells with index offsets into one Mesh for STL export.
- Reject a merged result that fails topology or self-intersection validation.
- Show body count, scope and merged-source health in Fabricate.
- Keep render geometry unchanged.

## Capabilities

### New Capabilities

- `multi-body`: explicit body scope and validated multi-shell STL export.

### Modified Capabilities

- `fabrication-contracts`: multi-body export is explicit, not a composition
  promise.
- `make-workspace`: Fabricate exposes scope and body count.

## Impact

- `src/application/fabricationSource.js`
- `src/core/document.js`
- Fabricate panel
- Unit/e2e tests and docs

## Non-goals

- No CSG/boolean union.
- No 3MF or per-body material metadata.
- No automatic overlap resolution.
- No change to single-body behavior.
