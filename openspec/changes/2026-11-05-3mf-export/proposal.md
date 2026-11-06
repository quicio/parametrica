## Why

Fabricate exports only binary STL. STL has no unit field, no object grouping and
no package metadata. Multi-body compositions lose body identity. Phase 6C adds
3MF as a first-class fabrication export without changing validation or render
geometry.

## What Changes

- Add `export3MF(bodies, options)` with a minimal OPC/3MF package.
- Write one 3MF object per validated body and one build item per object.
- Declare millimetres explicitly.
- Reuse fabrication validation and physical scale.
- Add deterministic ZIP timestamps and stable XML ordering.
- Add a format selector (STL/3MF) in Fabricate.
- Report object count, triangle count, unit and package metadata.

## Capabilities

### New Capabilities

- `3mf-export`: deterministic minimal 3MF packaging.

### Modified Capabilities

- `fabrication-export`: 3MF is a second validated exporter.
- `fabrication-contracts`: multi-body 3MF preserves body identity.
- `make-workspace`: format selector and export report.

## Impact

- `src/export/3mf.js`
- `src/export/zip.js` reuse
- Exporter and Fabricate panel
- Unit/e2e tests and docs

## Non-goals

- No materials, colors, textures or per-body appearance.
- No 3MF import.
- No slicer settings, supports or print profiles.
- No CSG or repair changes.
- No new dependency.
