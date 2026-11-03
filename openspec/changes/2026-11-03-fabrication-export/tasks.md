## 1. Exporter

- [ ] 1.1 Implement binary STL writer from Mesh/Solid.
- [ ] 1.2 Apply explicit mm scale without mutating world geometry.
- [ ] 1.3 Derive deterministic normals/facet order.

## 2. Gate

- [ ] 2.1 Require fabrication validation before writing bytes.
- [ ] 2.2 Reject open/non-manifold/inconsistent/degenerate geometry.
- [ ] 2.3 Surface self-intersection limitation explicitly.
  - Verify: unit tests for valid solid, open mesh, bad indices, units and
    byte determinism.

## 3. Acceptance

- [ ] 3.1 Document STL unit semantics and limits.
- [ ] 3.2 Run `npm run check`, `npm run test:e2e`, strict OpenSpec validation
      and archive.

## Acceptance criteria

- A validated closed mesh/solid exports to binary STL.
- Export is deterministic and unit-aware.
- Invalid geometry is rejected before bytes are written.
- No p5, camera, RenderScene or artboard dependency.
- No MAKE UI, 3MF or CSG.
