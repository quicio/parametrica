## 1. Overlay

- [x] 1.1 Add pure marker/triangle/cell derivation from pick + mapping.
- [x] 1.2 Draw overlay on Canvas single, clipped and excluded from captures.
- [x] 1.3 Add invalid mapping visual state.

## 2. Pin lifecycle

- [x] 2.1 Add Pin/Release and preserve hover while pinned.
- [x] 2.2 Add result validation and invalidation on geometry/view/layer/Quad/
      playback changes.
- [x] 2.3 Keep pin across viewport resize with reprojection.

## 3. Validation

- [x] 3.1 Add unit and e2e coverage for overlay, pin, invalidation and exports.
- [x] 3.2 Run `npm run check`, `npm run test:e2e`, strict OpenSpec validation
      and archive.

## Acceptance criteria

- Marker, triangle and valid cell are visible in Canvas single.
- Missing/mismatch mapping is visually distinct and has no cell.
- Pin/Release works separately from hover.
- Pinned results never survive invalid geometry/view/layer changes.
- Resize reprojects a valid pinned result.
- Overlays never enter render scene, SVG, plotter, PNG or GIF.
- No geometry, mapping, projection, scene, frame, bbox or export changes.


## Verification results

- `npm run check`: lint, **1894/1894** unit checks and production build pass.
- `npm run test:e2e`: **113/113** Playwright tests pass.
- `openspec validate --changes --strict`: pass.
- Unit coverage: valid marker/triangle/cell overlay, missing/malformed mapping
  without invented cell, pinned-result validation against geometry/visibility,
  and tampered world rejection.
- E2E coverage: hover overlay, PNG isolation, pin/release, pin invalidated by
  camera/projection/playback/layer changes, resize survival, Quad message and
  preference persistence.
- Manual visual check: Hyperbolic Saddle overlay shows marker and cell; Torus
  inspector shows the compact readout and PIN/RELEASE. Quad shows
  `Single view only`.
- No new geometry, SurfaceMapping, Projection Source, ViewTransform,
  RenderScene, frame, bbox or export changes.
