## 1. Projection contract

- [x] 1.1 Add opt-in `preserveSource` to mesh projection helpers.
- [x] 1.2 Attach explicit source mesh id, world aliases, vertex indices and
      orthographic depth.
- [x] 1.3 Keep normal projection allocation-free and render-equivalent.
  - Verify: XY/XZ/YZ depth, shared projected positions with distinct depth,
    world aliases, identity, 3D depth and stale-source stripping.

## 2. Compatibility

- [x] 2.1 Preserve SurfaceMapping identity and indices.
- [x] 2.2 Verify frame/bbox/export isolation and projection cache behavior.
  - Verify: mapping identity stable across camera changes; projected vertices
    invalidate; geometry/frame/bbox/SVG unchanged.

## 3. Acceptance

- [x] 3.1 Document the source contract, orthographic depth convention and
      lifecycle.
- [x] 3.2 Run `npm run check`, `npm run test:e2e`, strict OpenSpec validation
      and archive.

## Acceptance criteria

- World vertices are recoverable without 2D reconstruction.
- Vertex identity is explicit.
- XY/XZ/YZ preserve real orthographic depth.
- Perspective retains normalized per-vertex depth.
- Normal rendering does not allocate source sidecars.
- Render coordinates, faces, frame, bbox and exports are unchanged.
- SurfaceMapping remains compatible and unchanged.
- No picking, UI, z-buffer, RenderScene or export changes.


## Verification results

- `npm run check`: lint, **1840/1840** unit checks and production build pass.
- `npm run test:e2e`: **109/109** Playwright tests pass.
- `openspec validate --changes --strict`: pass.
- Unit coverage: opt-in source allocation, world alias identity, explicit
  source indices, XY/XZ/YZ orthographic depth, shared projected positions with
  different depth, perspective depth, source survival through frame transform,
  stale-source stripping, SurfaceMapping identity/indices, projection cache
  invalidation and SVG exclusion.
- Render coordinates, faces, frame, bbox and exports remain unchanged.
- No picking, UI, RenderScene, z-buffer or export consumer was added.
