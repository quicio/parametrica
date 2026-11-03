## 1. Exporter

- [x] 1.1 Implement binary STL writer from Mesh/Solid.
- [x] 1.2 Apply explicit mm scale without mutating world geometry.
- [x] 1.3 Derive deterministic normals/facet order.

## 2. Gate

- [x] 2.1 Require fabrication validation before writing bytes.
- [x] 2.2 Reject open/non-manifold/inconsistent/degenerate geometry.
- [x] 2.3 Surface self-intersection limitation explicitly.
  - Verify: unit tests for valid solid, open mesh, bad indices, units and
    byte determinism.

## 3. Acceptance

- [x] 3.1 Document STL unit semantics and limits.
- [x] 3.2 Run `npm run check`, `npm run test:e2e`, strict OpenSpec validation
      and archive.

## Acceptance criteria

- A validated closed mesh/solid exports to binary STL.
- Export is deterministic and unit-aware.
- Invalid geometry is rejected before bytes are written.
- No p5, camera, RenderScene or artboard dependency.
- No MAKE UI, 3MF or CSG.
