## Context

The current SVG exporter is a faithful canvas export, including fills,
gradients, overlays and diagnostics. A plotter-ready artifact needs different
rules: only stroke geometry matters, and the output should not depend on active
render modes.

## Decisions

### D1: Dedicated builder, not a mode of faithful SVG

`buildPlotterSVG(curves, view, size, document, layers)` emits:
- no background rect (transparent page);
- one `<path>` per curve, `fill="none"`;
- `M`/`L` plus `Z` for closed curves;
- layer groups in document order;
- the layer's stroke color/width/opacity/cap/join;
- the embedded Parametrica document comment.

It ignores fill, gradient, blend, overlays, meshes and all render-pass state.
This keeps plotter output predictable even if the user is viewing a gradient
surface with diagnostics active.

### D2: Visible layers only

Hidden layers are omitted. Layer order is preserved. Curves are the evaluated
projected curves, so orthographic views and camera projection still export
correctly.

### D3: Line tests

Unit tests verify:
- one finite path per curve;
- closed curves end with `Z`;
- hidden layers are absent;
- fills/gradients/blends/overlays do not leak;
- stroke width/cap/join are preserved.
This is the “line tests” requirement for this slice; no calibration sheet is
generated.

### D4: Keep placement

The action lives in KEEP → Export because it is a final artifact, not a
temporal or interactive operation. Temporal exports remain in Perform.

## Risks / Trade-offs

- Plotter SVGs have no page units; consumers scale by the viewBox. A future
  physical-units option can be added without changing the model.
- Per-layer colors are preserved; a single-pen workflow can override them in
  plotter software.
- Gradients/fills are intentionally lost; that is the point of this export.

## Open Questions

- Should a later version include a calibration line-test sheet or physical mm
  dimensions?
- Should plotter output merge all layers into one path for single-pen plotters?
