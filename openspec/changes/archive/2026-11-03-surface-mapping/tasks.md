## 1. Contract

- [x] 1.1 Build mesh + mapping in one logical-cell loop.
- [x] 1.2 Add `tessellateSurfaceWithMapping` and preserve `tessellateSurface`.
- [x] 1.3 Preserve real domain, cells, triangles, indices and corner UVs.
  - Verify: non-normalized/inverted domains, open/closed axes, normal/reverse
    seams, twists and shared seam vertices with distinct UVs.

## 2. Evaluation

- [x] 2.1 Cache `{ meshes, surfaceMappings }` together.
- [x] 2.2 Expose mappings on evaluation and layers.
- [x] 2.3 Verify reevaluation/topology invalidation and cache reuse.
  - Verify: mapping identity changes with domain/topology, stable evaluation
    reuses the cached mapping.

## 3. Isolation and acceptance

- [x] 3.1 Keep mapping out of Mesh.meta, RenderScene, render and export.
- [x] 3.2 Confirm geometry/frame/bbox/export invariance.
- [x] 3.3 Run `npm run check`, `npm run test:e2e`, strict OpenSpec validation
      and archive.

## Acceptance criteria

- Mapping is generated with the same cells as tessellation.
- UVs are real domain values, including inverted/non-normalized ranges.
- Closed/reverse seams preserve per-corner UVs even when vertex indices wrap.
- A welded vertex may carry multiple UVs.
- Mapping indices match mesh faces exactly.
- Invalid domains fail explicitly; degenerate zero-span UVs stay finite.
- Mapping invalidates/reuses with the mesh cache.
- No picking, UI, RenderScene, render or export changes.


## Verification results

- `npm run check`: lint, **1812/1812** unit checks and production build pass.
- `npm run test:e2e`: **109/109** Playwright tests pass.
- `openspec validate --changes --strict`: pass.
- Unit coverage: non-normalized and inverted domains, open/closed U/V,
  normal/reverse seams, twists, cell/triangle metadata, per-corner UVs,
  mesh index consistency, shared seam vertices with distinct UVs, invalid and
  zero-span domains, engine sidecar invalidation/reuse, geometry/frame/bbox
  invariance and SVG exclusion.
- No UI or render consumer was added.
