## 1. Model and sanitization

- [x] 1.1 Add `src/core/fillGradient.js` with defaults, validation and
      bbox-based linear/radial resolution.
- [x] 1.2 Extend `style.fill` sanitization and defaults without a document
      version bump.
  - Verify: unit tests for defaults, clamping, 2–4 stop validation and
    round-trip.

## 2. Canvas rendering

- [x] 2.1 Add `src/render/fill.js` and use it in the stroke pass for closed
      fills.
- [x] 2.2 Use the same gradient in Surface Fill, preserving per-face depth
      alpha.
  - Verify: pass/SVG tests; no change to solid fill or Gradient Wireframe.

## 3. SVG output

- [x] 3.1 Extend `SvgContext` with gradient definitions, unique IDs, fill
      opacity and `url(#…)` paint.
- [x] 3.2 Emit linear/radial gradients with the same bbox geometry as canvas.
  - Verify: SVG assertions for linear/radial defs and fill URLs.

## 4. Style UI

- [x] 4.1 Add Fill type, angle, center, radius and 2–4 stop controls.
- [x] 4.2 Wire the controls to the active layer, content lock and live canvas.
  - Verify: e2e changes the document, canvas and exported SVG.

## 5. Documentation and acceptance

- [x] 5.1 Update README, SPEC, architecture, audit and style/export specs.
- [x] 5.2 Run `npm run check`, `npm run test:e2e`, strict OpenSpec validation
      and archive.

## Acceptance criteria

- Fill supports solid, linear and radial modes.
- Linear angle changes the visible direction.
- Radial center/radius changes the visible gradient.
- Closed curves and Surface Fill render gradients on canvas.
- SVG exports matching `<linearGradient>`/`<radialGradient>` fills.
- Solid fills and existing documents remain valid.
- Gradient Wireframe semantics are unchanged.
- No SVG frame, plotter or MAKE work.


## Verification results

- `npm run check`: lint, **1657/1657** unit checks and production build pass.
- `npm run test:e2e`: **98/98** Playwright tests pass.
- `openspec validate --changes --strict`: pass.
- Unit coverage verifies fill-gradient defaults, clamping, linear/radial
  geometry, SVG defs/paint and Surface Fill gradient reuse.
- E2E coverage verifies Style controls, canvas updates, color stops and SVG
  radial output.
- No document version bump; old documents load with the gradient disabled.
