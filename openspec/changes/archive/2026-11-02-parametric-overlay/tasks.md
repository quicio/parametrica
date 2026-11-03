## 1. Summary model

- [x] 1.1 Add `buildParametricSummary()` and value formatting.
  - Verify: unit rows for generator, Radius, advanced flags, arrays, booleans,
    numbers and expressions.

## 2. Overlay

- [x] 2.1 Add the canvas-edge overlay, advanced dimming and toggle button.
- [x] 2.2 Add the Canvas Parametrics checkbox and persisted visibility.
- [x] 2.3 Refresh from `App.evaluate()`.
  - Verify: e2e visibility, toggles, live value update and text content.

## 3. Docs and acceptance

- [x] 3.1 Update README, SPEC, architecture, audit and roadmap.
- [x] 3.2 Run `npm run check`, `npm run test:e2e`, strict OpenSpec validation
      and archive.

## Acceptance criteria

- The overlay shows the active layer generator and shape parameters.
- It shows seed and enabled operator names.
- It can be hidden/shown from the canvas and Canvas section.
- Visibility persists and updates after parameter/layer changes.
- Advanced values are visible but secondary.
- The overlay is read-only and does not mutate the document.


## Verification results

- `npm run check`: lint, **1704/1704** unit checks and production build pass.
- `npm run test:e2e`: **107/107** Playwright tests pass.
- `openspec validate --changes --strict`: pass.
- Unit tests cover active-layer summary, advanced flags, arrays, booleans,
  numbers and expressions.
- E2E covers initial content, Radius 120→200 updates, `ƒ` toggle, Canvas
  checkbox sync and visibility state.
- Overlay remains read-only and UI-only.
