## 1. Document and renderer

- [x] 1.1 Add `view.artboard`/`view.style` defaults, sanitization and v2 migration.
  - Verify: document isolation, round-trip, old preset defaults.
- [x] 1.2 Render artboard aspect, background, margin and style in p5.
  - Verify: e2e canvas dimensions/background, camera drag on non-square artboard.
- [x] 1.3 Keep depth metadata and current render passes compatible.

## 2. UI

- [x] 2.1 Artboard preset selector + width/height/background/margin controls.
- [x] 2.2 Stroke color/width/opacity/cap/join and optional fill controls.
- [x] 2.3 Palette selector with preview.
  - Verify: e2e changes style and document values.

## 3. Export

- [x] 3.1 SVG viewBox/background/style fidelity.
- [x] 3.2 PNG artboard dimensions and background.
- [x] 3.3 Golden SVG snapshot for a styled document.
  - Verify: unit snapshot + e2e download checks (where possible).

## 4. Verification

- [x] 4.1 `npm test`, `npm run build`, `npm run test:e2e`.
- [x] 4.2 Update README/SPEC/roadmap.
- [x] 4.3 Validate and archive `artboard-style`.

## Verification results

- `npm test`: **778/778 checks** (group 17 added).
- `npm run build`: succeeds; bundle warning unchanged.
- `npm run test:e2e`: **38/38 tests**, including artboard/palette controls.
- `openspec change validate artboard-style`: valid.
