## 1. Derivation

- [x] 1.1 Classify open borders, closed seams and reverse/twist seams from
      mapping domain + per-corner UVs.
- [x] 1.2 Deduplicate edges and project through the scene transform.
- [x] 1.3 Handle inverted, missing, malformed and zero-span domains.

## 2. Render/UI

- [x] 2.1 Draw border/seam/twist styles in single Canvas, clipped and cached.
- [x] 2.2 Add Seams toggle and explicit legend with status.
- [x] 2.3 Keep overlay out of Quad, captures and exports.

## 3. Validation

- [x] 3.1 Add unit/e2e coverage for all topology and lifecycle cases.
- [x] 3.2 Run `npm run check`, `npm run test:e2e`, strict OpenSpec validation
      and archive.

## Acceptance criteria

- Borders and seams are semantically distinct.
- Reverse seams are marked as twists without orientation claims.
- Inverted domains preserve logical ends.
- Missing/malformed mappings never invent seams.
- Single Canvas only; no export/render/geometry changes.
- Legend is explicit and toggleable.


## Verification results

- `npm run check`: lint, **1922/1922** unit checks and production build pass.
- `npm run test:e2e`: **114/114** Playwright tests pass.
- `openspec validate --changes --strict`: pass.
- Unit coverage: open borders, closed U/V seams, both closed, reverse/twist,
  inverted domains, missing/malformed/zero-span mappings, perspective
  projection and no mutation.
- E2E coverage: toggle, legend status, canvas overlay, PNG isolation, Quad
  hiding, return to single and mapping-unavailable state.
- Manual visual check: Torus closed seams, Hyperbolic Saddle borders, legend.
- No geometry, SurfaceMapping, Projection Source, ViewTransform, RenderScene,
  frame, bbox or export changes.
