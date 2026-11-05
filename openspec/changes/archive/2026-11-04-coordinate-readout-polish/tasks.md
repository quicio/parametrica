## 1. Readout

- [x] 1.1 Add pinned readout state and invalidate on evaluation/projection.
- [x] 1.2 Add 3D surface-hit XYZ readout via existing picking.
- [x] 1.3 Keep orthographic in-plane semantics and unit display.

## 2. UI and tests

- [x] 2.1 Add Pin/Release and 3D hint in Coordinates.
- [x] 2.2 Verify export isolation and no depth inference.
  - Verify: unit readout mapping; e2e pin/invalidate/3D hit.

## 3. Acceptance

- [x] 3.1 Document 3D and pin limitations.
- [x] 3.2 Run `npm run check`, `npm run test:e2e`, strict OpenSpec validation
      and archive.

## Acceptance criteria

- Pinned readout is explicit and revalidated.
- 3D shows XYZ only for a surface hit.
- Orthographic depth remains unknown.
- Units are display-only.
- Overlay is excluded from exports.
