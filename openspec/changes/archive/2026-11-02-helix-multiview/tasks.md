## 1. Layout state and UI

- [x] 1.1 Add `view.layout` with single/quad sanitization and defaults.
- [x] 1.2 Add the Camera Layout control, disabled for non-spatial documents.
- [x] 1.3 Document the canvas-only export boundary.

## 2. Quad renderer

- [x] 2.1 Add `projectionOverride` to `buildRenderScene`.
- [x] 2.2 Extract the pass/overlay loop and render four clipped panels with
      per-panel analysis.
- [x] 2.3 Draw labels/borders and keep single mode unchanged.
  - Verify: unit layout sanitization; e2e quad toggle, layout state and canvas
    difference.

## 3. Tests and docs

- [x] 3.1 Add unit and e2e coverage for the quad layout.
- [x] 3.2 Update README, SPEC, architecture, audit and roadmap.
- [x] 3.3 Run `npm run check`, `npm run test:e2e`, strict OpenSpec validation
      and archive.

## Acceptance criteria

- Spatial documents can switch between single and quad layouts.
- Quad shows 3D, XY, XZ and YZ simultaneously.
- The same camera/document/passes are used per panel.
- Single layout remains unchanged.
- PNG/GIF capture the quad; SVG/plotter report the canvas-only boundary.
- 2D documents stay single.
- No new projection math, passes or document version.


## Verification results

- `npm run check`: lint, **1672/1672** unit checks and production build pass.
- `npm run test:e2e`: **103/103** Playwright tests pass.
- `openspec validate --changes --strict`: pass.
- Unit tests verify single/quad layout sanitization and fallback.
- E2E verifies switching to Quad, layout persistence and a changed canvas
  composition, then returning to Single.
- Quad uses the same camera/document/passes; analysis is per panel.
- SVG/plotter use the active projection and report the canvas-only boundary.
