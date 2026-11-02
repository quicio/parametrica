## 1. Model and rendering

- [x] 1.1 Add optional `layer.modes` and `view.passOpacity` with sanitization.
- [x] 1.2 Use effective layer modes and per-pass alpha in p5.
- [x] 1.3 Use effective layer modes and pass-group opacity in SVG.
  - Verify: unit tests for round-trip, effective modes and opacity markup.

## 2. UI

- [x] 2.1 Add Style Render passes Global/Custom checkboxes.
- [x] 2.2 Add per-pass opacity sliders in Render.
  - Verify: e2e layer override state and canvas opacity change.

## 3. Documentation and acceptance

- [x] 3.1 Update README, SPEC, architecture, audit and roadmap.
- [x] 3.2 Run `npm run check`, `npm run test:e2e`, strict OpenSpec validation
      and archive.

## Acceptance criteria

- Layers inherit global modes unless a custom list is set.
- Custom layer mode lists affect only that layer.
- Per-pass opacity changes canvas and SVG and persists.
- Global mode behavior and old documents are unchanged.
- Applicability and analysis remain truthful.
- No per-pass color/width or per-layer overlays.


## Verification results

- `npm run check`: lint, **1687/1687** unit checks and production build pass.
- `npm run test:e2e`: **105/105** Playwright tests pass.
- `openspec validate --changes --strict`: pass.
- Unit tests cover layer-mode round-trip/evaluation, pass-opacity sanitization
  and SVG group opacity.
- E2E covers the Style Global/Custom override, per-pass opacity and unchanged
  global modes.
- Per-pass color/width remains explicitly out of scope.
