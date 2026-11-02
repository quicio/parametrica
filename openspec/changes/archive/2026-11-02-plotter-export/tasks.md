## 1. Plotter builder

- [x] 1.1 Add `Exporter.buildPlotterSVG()` with visible-layer groups and one
      stroke path per curve.
- [x] 1.2 Ignore fills, gradients, blends, overlays, meshes and diagnostic
      passes; preserve stroke attributes and closed seams.
  - Verify: unit tests for path count, Z, hidden layers, no fill/gradient,
    finite coordinates and stroke attributes.

## 2. UI

- [x] 2.1 Add Export Plotter SVG to KEEP → Export.
  - Verify: e2e downloads the SVG and checks plotter markers.

## 3. Documentation and acceptance

- [x] 3.1 Update README, SPEC §17, architecture, audit and roadmap.
- [x] 3.2 Run `npm run check`, `npm run test:e2e`, strict OpenSpec validation
      and archive.

## Acceptance criteria

- Plotter SVG contains only visible stroke geometry.
- One path per curve, closed curves use `Z`, coordinates are finite.
- No background, fills, gradients, blends, overlays, meshes or diagnostics.
- Layer order, stroke color/width/opacity/cap/join and embedded document remain.
- Faithful SVG/PNG/GIF/SVG-frame exports are unchanged.
- No physical-unit UI, G-code or calibration sheet.


## Verification results

- `npm run check`: lint, **1665/1665** unit checks and production build pass.
- `npm run test:e2e`: **101/101** Playwright tests pass.
- `openspec validate --changes --strict`: pass.
- Unit tests verify visible-layer path groups, closed `Z`, no fill/gradient/
  blend/overlay/pass leakage, finite line output and stroke attributes.
- E2E verifies the Export Plotter SVG button and downloaded stroke-only output.
- Faithful SVG/PNG/GIF/SVG-frame exports remain unchanged.
