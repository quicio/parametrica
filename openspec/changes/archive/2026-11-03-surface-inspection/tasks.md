## 1. Ray infrastructure

- [x] 1.1 Add canvas→artboard conversion.
- [x] 1.2 Add perspective and orthographic world rays.
- [x] 1.3 Add double-sided ray–triangle intersection.
  - Verify: cursor conversion, zoom/frame scale, camera rotation, XY/XZ/YZ,
    degenerate triangles and exact world recovery.

## 2. Surface picker

- [x] 2.1 Intersect canonical world meshes and select nearest hit.
- [x] 2.2 Resolve SurfaceMapping face/cell/corner UVs and world barycentrics.
- [x] 2.3 Handle missing/mismatched mappings and expose depth/distance.
  - Verify: occlusion, multiple surfaces, seams/twists, non-normalized/inverted
    domains, perspective consistency, missing mapping.

## 3. UI

- [x] 3.1 Add compact Surface Inspector and Canvas toggle.
- [x] 3.2 Update on hover, camera/zoom and re-evaluation; hide on leave.
- [x] 3.3 Disable inspection in Quad with an explicit message.
  - Verify: e2e inspector content, no-hit state, toggle and export isolation.

## 4. Acceptance

- [x] 4.1 Document ray math, occlusion, UV/XYZ and limits.
- [x] 4.2 Run `npm run check`, `npm run test:e2e`, strict OpenSpec validation
      and archive.

## Acceptance criteria

- Cursor maps consistently regardless of canvas resolution.
- Perspective and orthographic rays use real camera/frame conventions.
- World ray–triangle picking works on slanted surfaces and variable depth.
- Nearest visible surface wins independently of painter order.
- UVs come from SurfaceMapping and preserve seams/twists/inverted domains.
- XYZ and UV are perspective-consistent.
- Inspector shows surface, triangle, cell, UV, XYZ and depth.
- No render, frame, bbox, export or geometry changes.
- Quad, editing, CAD, z-buffer and inspection export remain out of scope.


## Verification results

- `npm run check`: lint, **1871/1871** unit checks and production build pass.
- `npm run test:e2e`: **110/110** Playwright tests pass.
- `openspec validate --changes --strict`: pass.
- Unit coverage: canvas→artboard conversion, perspective/ortho rays, camera
  rotation, XY/XZ/YZ axes, degenerate triangles, world triangle hits, occlusion,
  multiple meshes, missing mappings, seam UVs, inverted domains, slanted
  perspective triangles, exact XYZ recovery, frame/bbox/geometry invariance and
  SVG exclusion.
- E2E coverage: inspector toggle, hover readout, mapping status, UV/XYZ/cell
  fields, no-hit state, and hide on disable.
- Manual visual check: Torus inspector shows surface, triangle, cell, UV, XYZ,
  distance and mapping status without changing the artwork.
- No Quad picking, editing, z-buffer or export consumer was added.
