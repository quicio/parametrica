## Why

The current SVG exporter writes only the projected curves. It warns that
Gradient Wireframe, Surface Fill, overlays, diagnostic passes and blend modes
are omitted. That warning is honest, but it leaves the most visual parts of the
canvas out of the exported file.

The render passes already encode the visual truth of the scene. Duplicating
each pass as a separate exporter would drift. The export should replay the same
pass draw calls into an SVG recorder.

## What Changes

- Add `src/export/svgContext.js`: a small p5-like SVG recorder supporting the
  primitives used by passes and overlays.
- Rebuild `Exporter.buildSVG` around that recorder:
  - run active render passes per layer;
  - preserve layer order and style blend;
  - draw overlays in a separate top group;
  - keep the embedded document comment and artboard contract.
- Represent blend modes with `mix-blend-mode` and isolate the root.
- Support vector forms of Gradient Wireframe, Surface Fill/Wireframe,
  diagnostics, epicycles, topology and overlays.
- Keep Signed Distance as an explicit raster-only omission with a warning.
- Update the omission list, tests, audit and docs.

This does not add new fill-gradient authoring. The existing fill remains solid;
the only gradient is the color ramp used by Gradient Wireframe.

## Capabilities

### New Capabilities

- `svg-export`: vector render-pass, overlay and blend fidelity for SVG.

### Modified Capabilities

- `ui-integrity`: export fidelity now distinguishes reproducible vector
  features from raster-only omissions.

## Impact

- New: `src/export/svgContext.js`.
- Modified: `src/export/Exporter.js`.
- Tests: `test/lab.smoke.mjs`, `e2e/hardening.spec.js`.
- Docs: README, SPEC §17, architecture, navigation audit, export specs.
- No document, preset, notebook or session format change.
- No SVG frame-by-frame, plotter-ready SVG or MAKE.

## Non-goals

- No new fill-gradient authoring or fill modes.
- No raster fallback embedded for Signed Distance.
- No SVG frame sequence.
- No plotter-ready SVG.
- No MAKE/fabrication.
- No change to render-pass behavior or the canvas.
