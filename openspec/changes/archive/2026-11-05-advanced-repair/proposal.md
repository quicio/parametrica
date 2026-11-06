## Why

Phase 5A–5D can prepare, validate, export and combine solids, but some meshes
still fail fabrication because of inconsistent face orientation, duplicate or
degenerate faces, or holes whose fan caps are not appropriate. Users need an
explicit repair step with a report, not silent mutation.

## What Changes

- Add a pure `repairMesh(mesh, options)` geometry API.
- Remove invalid/degenerate/duplicate faces and weld vertices.
- Repair orientation consistency across manifold edges.
- Flip closed shells whose signed volume is negative.
- Cap open loops with `fan`, `planar` (ear clipping) or `auto` strategy.
- Fall back to fan when a planar cap cannot be triangulated.
- Return a structured repair report with actions, fallbacks and remaining
  validation errors.
- Add explicit Fabricate Repair and Cap strategy controls.
- Keep repair off by default and keep render/document geometry untouched.

## Capabilities

### New Capabilities

- `advanced-repair`: orientation, cleanup and cap-strategy repair.

### Modified Capabilities

- `fabrication-contracts`: repair-derived sources still pass validation.
- `make-workspace`: explicit repair controls and repair report.

## Impact

- `src/geometry/repair.js`
- `src/application/fabricationSource.js`
- `src/core/document.js` view metadata
- Fabricate panel
- Unit/e2e tests and docs

## Non-goals

- No CSG changes.
- No self-intersection repair.
- No vertex/face direct editing.
- No automatic repair on export.
- No 3MF or new dependency.
