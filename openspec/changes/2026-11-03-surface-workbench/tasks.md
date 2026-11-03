## 1. Contracts

- [x] 1.1 Extend spatial operator declarations for Surface/Mesh.
- [x] 1.2 Implement translate, rotate, scale, mirror and repeat for spatial
      geometry.
- [x] 1.3 Add keyed acceptance/error handling.
  - Verify: unit tests for each kind, finite coordinates and rejected inputs.

## 2. Pipeline

- [x] 2.1 Run world surface operators before tessellation.
- [x] 2.2 Keep curve and surface stages isolated.
- [x] 2.3 Preserve or regenerate SurfaceMapping according to topology.
  - Verify: cache tests for camera-only, transform-only, topology-changing and
    operator-error paths.

## 3. UI and compatibility

- [x] 3.1 Show only applicable operators for surfaces.
- [x] 3.2 Keep existing curve operator order and behavior.
  - Verify: e2e transform/mirror/scale surface flow and curve regression suite.

## 4. Acceptance

- [x] 4.1 Document operator semantics and mapping lifecycle.
- [x] 4.2 Run `npm run check`, `npm run test:e2e`, strict OpenSpec validation
      and archive.

## Acceptance criteria

- A Surface can pass through supported world operators before tessellation.
- Supported transforms preserve finite world coordinates and visual inspection.
- Topology-preserving transforms keep mapping valid; topology changes
  regenerate it.
- Curves keep existing behavior.
- No CSG, caps, repair, fabrication UI or new geometric kind.
