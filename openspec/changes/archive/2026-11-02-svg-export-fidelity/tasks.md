## 1. SVG recorder

- [x] 1.1 Add `src/export/svgContext.js` with the p5 primitives used by passes
      and overlays, plus SVG escaping and paint attributes.
- [x] 1.2 Reject unsupported raster primitives with an explicit error.
  - Verify: unit tests for paths, lines, circles, rects, text, points, blend
    and raster rejection.

## 2. Pass replay

- [x] 2.1 Replace the curve-only builder with per-layer pass replay using the
      same analysis/mesh/document data as the canvas.
- [x] 2.2 Emit Gradient Wireframe, Surface Fill/Wireframe, diagnostics,
      epicycles, topology and overlays.
- [x] 2.3 Keep Signed Distance raster-only and report it through
      `unsupportedSvgFeatures` and the export notice.
- [x] 2.4 Preserve layer order, transparent/background artboard and the
      embedded document comment.
- [x] 2.5 Apply blend modes with `mix-blend-mode` and root isolation.
  - Verify: unit SVG assertions for every supported category and omission.

## 3. Tests

- [x] 3.1 Update the SVG omission tests: vector passes no longer omitted;
      Signed Distance remains raster-only.
- [x] 3.2 Add export assertions for gradient colors, surface polygons,
      overlays, diagnostics and blend.
- [x] 3.3 Update the e2e SVG download to verify the new pass groups and no
      false omission notice.
  - Verify: `npm test`, `npm run test:e2e`.

## 4. Documentation and acceptance

- [x] 4.1 Update README, SPEC §17, architecture, audit and export specs.
- [x] 4.2 Run `npm run check`, `npm run test:e2e`, strict OpenSpec validation
      and archive the change.

## Acceptance criteria

- Active vector render passes appear in SVG.
- Gradient Wireframe uses the current color ramp.
- Surface Fill and Surface Wireframe export as polygons/edges.
- Diagnostic passes and overlays export as SVG primitives.
- Blend modes use `mix-blend-mode` on layer groups.
- Artboard, layer order and embedded document metadata remain intact.
- Signed Distance is the only remaining raster-only omission.
- No new fill-gradient authoring, SVG frame export, plotter or MAKE.


## Verification results

- `npm run check`: lint, **1644/1644** unit checks and production build pass.
- `npm run test:e2e`: **97/97** Playwright tests pass.
- `openspec validate --changes --strict`: pass.
- Unit coverage verifies gradient ramps, surface polygons, diagnostics,
  overlays, blend groups, raster-only SDF and layered SVG groups.
- E2E coverage verifies downloaded SVG pass groups and a canvas-vs-SVG
  non-background pixel comparison for a vector-stroke artboard.
- Build adds the SVG recorder to the existing exporter chunk; no new
  dependency or document format change.
