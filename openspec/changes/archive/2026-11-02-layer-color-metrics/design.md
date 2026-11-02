## Context

`view.colorMetric` drives Gradient Wireframe. Layer overrides already exist for
render modes; color metric can follow the same inheritance pattern.

## Decisions

### D1: Optional layer metric

`layer.colorMetric` is null by default. When set to a valid metric, the layer
pass data uses it; otherwise `view.colorMetric` is used.

### D2: UI

Style gains a Color metric selector with Global + the five metrics. Global sets
`layer.colorMetric = null`; other options write the metric. The control is
disabled under content lock.

### D3: Rendering and SVG

`P5Adapter` and `buildSVG` merge `colorMetric` into each layer's pass view.
Gradient Wireframe therefore uses the layer metric for canvas and SVG without
changes to the pass itself.

## Risks / Trade-offs

- More per-layer controls; grouped in Style.
- Global remains the default, so existing documents are unchanged.
- Per-layer metrics are only meaningful when Gradient Wireframe is active.

## Open Questions

- Should custom palette presets remember a preferred metric?
