## Why

`SvgContext` is the p5-like recorder the render passes replay into for SVG, and
`Exporter` is the adapter that turns the export port into downloadable files.
Both were untyped and sat between typed render/domain code and browser APIs.

## What Changes

- Convert `export/svgContext.js` to `.ts` with typed recorder state, colors,
  gradients and markup attributes.
- Convert `export/Exporter.js` to `.ts` with an explicit `ExportPort`, SVG
  builder inputs and legacy plain-context normalization.
- Keep the JS compatibility re-exports.
- Update the architecture test and export dependency rule to inspect `Exporter.ts`.

## Out of Scope

- The concrete renderer, UI controls and composition export port.
- Changing SVG markup, GIF plan, STL/3MF bytes or download behavior.
