## Types

- `SvgContext` recorder state, `ColorStyle`, `Snapshot`, `GradientSpec`.
- `ExportPort`, `SvgDocumentLike`, `SvgViewLike`, `SvgLayerLike`,
  `SvgCurveLike`, `SvgBuildOptions`, `GifExportOptions`.
- Legacy plain-context input normalized to `ExportPort`.

## Rules

- The exporter never receives the App instance; it only reads the port.
- Scene and fabrication boundaries cast once at the adapter edge.
- Browser download helpers keep the same Blob/DOM behavior.
- Optional renderer capabilities are checked before use.

## Verification

- `tsc --noEmit`, Node, arch and e2e gates pass.
- SVG/quad/plotter markup, GIF frames, STL/3MF bytes and JSON output are
  unchanged.
