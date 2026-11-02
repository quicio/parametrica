## 1. Model

- [x] 1.1 Add `view.colorMetric` with sanitization and auto default.
- [x] 1.2 Extend gradient metric series/range for height, radius, curvature
      and arc length.
  - Verify: unit tests for defaults, sanitization, ranges and fallback.

## 2. Rendering

- [x] 2.1 Use the metric in `gradient-wireframe`.
- [x] 2.2 Request analysis only when curvature is selected.
- [x] 2.3 Add the Render Gradient metric control.
  - Verify: e2e UI state and canvas/SVG metric colors.

## 3. Documentation and acceptance

- [x] 3.1 Update README, SPEC, architecture, audit and roadmap.
- [x] 3.2 Run `npm run check`, `npm run test:e2e`, strict OpenSpec validation
      and archive.

## Acceptance criteria

- Auto preserves the existing height/radius behavior.
- Height, radius, curvature and arc-length metrics produce distinct ranges.
- Curvature/arc work in canvas and SVG.
- Palette/ramp independence remains intact.
- No new pass or custom palette editor.


## Verification results

- `npm run check`: lint, **1679/1679** unit checks and production build pass.
- `npm run test:e2e`: **103/103** Playwright tests pass.
- `openspec validate --changes --strict`: pass.
- Unit tests cover defaults, sanitization, height/radius/curvature/arc ranges
  and metric fallback.
- E2E covers the Render Gradient metric control and document state.
- SVG reuses the same gradient pass and carries metric colors; ramp/palette
  independence is unchanged.
