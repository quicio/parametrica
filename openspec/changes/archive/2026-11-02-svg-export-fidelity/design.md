## Context

`Exporter.buildSVG` currently writes one path per projected curve. The canvas
draws a different thing: `P5Adapter` composes registered passes with layer
styles, analysis, meshes and overlays. The audit records the resulting SVG
omissions.

## Fit review

No blocking conflict was found.

- Passes and overlays use a small, shared p5 primitive surface.
- The exporter already receives evaluated curves, layers and document state.
- Layer order, artboard and embedded document metadata are already stable.
- The main gap is a recorder, not a new renderer.

## Decision: replay passes into an SVG recorder

`SvgContext` implements the p5 subset used by the current passes:
`fill`, `stroke`, `noFill`, `noStroke`, `strokeWeight`, cap/join, shapes,
vertices, lines, points, circles, squares, rects, text and push/pop.

`buildSVG` creates one recorder per active pass. It feeds the same layer data
that `P5Adapter` uses: curves, bbox, analysis, meshes, view/style, document and
time. The emitted primitives are wrapped in a layer group with the layer's
blend mode.

This keeps one source of truth. Future vector passes gain SVG support by using
the supported primitive set; unsupported calls fail into the omission path.

## Mapping

| Canvas feature | SVG representation |
|---|---|
| Stroke, wireframe, control polygon | `<path>` / `<line>` with stroke styles |
| Points | `<circle>` with stroke-derived fill |
| Gradient Wireframe | bucketed `<line>` segments using the existing ramp |
| Surface Wireframe | projected `<line>` edges |
| Surface Fill | painter-ordered `<path>` polygons with depth alpha |
| Tangents / normals / curvature | vector `<line>` segments |
| Negative space | filled `<path>` |
| Topology | `<line>`/`<circle>` markers; `<text>` budget warning |
| Epicycles | `<circle>`/`<line>` chain |
| Overlays | separate top group with circles, ticks and bbox |
| Blend | `mix-blend-mode` on the layer group, root `isolation:isolate` |
| Signed Distance | raster-only; skip and warn |

Fill gradients are not a current document feature. Solid fill and the existing
Gradient Wireframe ramp are represented; no new gradient authoring is added.

## Compatibility

- SVG remains a single document with the same viewBox, artboard background and
  embedded Parametrica document comment.
- `mix-blend-mode` is CSS/SVG2-era; browsers support it, but some editors or
  older consumers may ignore it. The canvas remains the source of truth and
  PNG remains the raster fallback.
- Signed Distance remains a documented raster-only omission.
- Raster-only passes are not embedded as full-canvas images; that would turn
  the vector export into a PNG.

## Risks / Trade-offs

- Surface Fill SVG can be large because each face is a path. The current
  painter ordering is preserved; file size is the honest cost of fidelity.
- A generic recorder can hide a future pass that uses an unsupported p5 call.
  The build marks that pass omitted instead of throwing.
- Blend depends on consumer support. The warning copy should state the
  remaining raster-only case and the PNG fallback.

## Open Questions

- Should a future SVG 2 profile opt into filters for rough/raster diagnostics?
- Should Signed Distance get an optional raster embed later?
