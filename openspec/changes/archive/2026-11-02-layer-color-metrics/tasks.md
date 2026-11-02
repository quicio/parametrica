## 1. Model and render

- [x] 1.1 Add optional `layer.colorMetric` with sanitization and evaluation.
- [x] 1.2 Use it in canvas and SVG pass data.
- [x] 1.3 Add the Style selector.
  - Verify: unit round-trip/evaluation; e2e layer and global metric state.

## 2. Docs and acceptance

- [x] 2.1 Update docs, audit and roadmap.
- [x] 2.2 Run `npm run check`, `npm run test:e2e`, strict OpenSpec validation
      and archive.

## Acceptance criteria

- Layers inherit the global metric by default.
- A layer override affects only that layer in canvas/SVG.
- Global metric remains unchanged.
- Old documents are unchanged.
- No custom palette editor or new metric.


## Verification results

- `npm run check`: lint, **1689/1689** unit checks and production build pass.
- `npm run test:e2e`: **105/105** Playwright tests pass.
- `openspec validate --changes --strict`: pass.
- Unit tests verify layer metric evaluation and round-trip.
- E2E verifies the Style selector, layer override and unchanged global metric.
