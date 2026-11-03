## 1. Contracts and transform

- [x] 1.1 Add `SPACE`, frame defaults/sanitization, effective camera and
      `ViewTransform`.
  - Verify: unit tests for space ids, frame sanitization, fit/native/world
    anchoring and device mapping.
- [x] 1.2 Refactor world projection to use the shared transform.
  - Verify: legacy clipping, fit and mesh tests continue to pass.

## 2. Engine and scene

- [x] 2.1 Move planar fit out of generator post-processing into the engine.
  - Verify: generator post-processing no longer fits; documents still fit.
- [x] 2.2 Add `view.frame` to document defaults and sanitization.
- [x] 2.3 Build one artboard-space scene from world geometry.
- [x] 2.4 Share one frame across multiple meshes and spatial layers.
  - Verify: multi-mesh distance and multi-layer offset tests; single-layer
    and single-surface coordinates match the legacy output exactly.

## 3. Backends

- [x] 3.1 Make canvas, Quad, SVG and plotter consume the render scene.
- [x] 3.2 Reproject Quad's 3D panel from world geometry even when the
      document is orthographic.
- [x] 3.3 Keep guides out of captured PNG/GIF artifacts.
  - Verify: panel, hardening and full e2e suites; SVG/plotter coordinate
    parity with the scene.

## 4. Docs and acceptance

- [x] 4.1 Document P/W/A, frame modes, legacy fit alias and limitations.
- [x] 4.2 Run `npm run check`, `npm run test:e2e`, strict OpenSpec validation
      and archive.

## Acceptance criteria

- Engine results declare `space` and preserve canonical world geometry.
- One `ViewTransform` supplies camera, projection and frame.
- `scene` mode preserves relative layer and multi-mesh positions.
- Single-layer spatial output matches the previous framing exactly.
- Planar curves remain artboard-space and visually unchanged.
- Canvas, Quad, SVG and plotter share the same artboard coordinates.
- Documents without `view.frame` load and behave normally.
- Spatial Reference, UV Domain, CAD and physical units remain out of scope.


## Verification results

- `npm run check`: lint, **1734/1734** unit checks and production build pass.
- `npm run test:e2e`: **107/107** Playwright tests pass.
- `openspec validate --changes --strict`: pass.
- Unit coverage: space ids, frame sanitization, fit/native/world anchoring,
  device mapping, shared multi-mesh/multi-layer framing, exact single-layer
  and single-surface parity, planar passthrough, SVG/plotter scene parity,
  Quad reprojection from an orthographic document, and generator fit removal.
- E2E coverage: canvas sizing, parametric overlay, render passes, opacity,
  SVG/plotter export, camera guard and all existing UI flows.
- Known limits: `generator.params.fit` remains a compatibility alias; mixed
  2D/3D scenes do not share a spatial frame; Spatial Reference, UV Domain,
  physical units and Quad SVG/plotter reconstruction remain future work.
