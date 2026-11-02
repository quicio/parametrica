## Why

The faithful SVG export now includes fills, gradients, overlays and diagnostic
passes. A pen plotter needs the opposite: only continuous stroke geometry, no
raster effects and no filled regions. A dedicated plotter SVG avoids asking the
user to manually disable passes and edit the exported file.

## What Changes

- Add `Exporter.buildPlotterSVG()`: visible layers, one path per curve,
  `fill="none"`, preserved stroke color/width/opacity/cap/join and closed
  `Z` segments.
- Ignore fills, gradients, blend modes, overlays, mesh fills and diagnostic
  passes.
- Add **Export Plotter SVG** to the Export section.
- Keep the Parametrica document embedded for reproducibility.
- Add line-geometry tests for path count, closed seams, finite coordinates,
  hidden layers and line attributes.
- Update docs, audit and roadmap.

## Capabilities

### New Capabilities

- `plotter-export`: stroke-only SVG and line fidelity.

### Modified Capabilities

- None.

## Impact

- Modified: `src/export/Exporter.js`, `src/ui/Controls.js`.
- Tests: `test/lab.smoke.mjs`, `e2e/hardening.spec.js`.
- Docs: README, SPEC §17, architecture, audit, roadmap.
- No document format change.
- No new tracing, animation, rendering or physical-unit UI.

## Non-goals

- No pen-speed, pressure, multi-pen or G-code output.
- No physical mm/units selector.
- No line-test calibration sheet; line fidelity is covered by tests.
- No change to faithful SVG, PNG, GIF or SVG frame export.
