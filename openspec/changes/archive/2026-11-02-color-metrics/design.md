## Context

`gradient-wireframe` buckets curve segments into the existing `view.colorRamp`.
Its value currently comes from `gradientAxisValue`: radial distance in XY and
height in 3D/XZ/YZ. `analysis` already carries curvature and arc-length data.

## Decisions

### D1: Global metric on the view

`view.colorMetric` is a global render setting, sanitized to
`auto|height|radius|curvature|arc`. It does not change the palette or ramp.

### D2: Metric series

`metricSeries()` resolves one value per point:
- auto → existing projection-aware `gradientAxisValue`;
- height → `h3` when present, otherwise `y`;
- radius → world `hypot(x3,y3)` when present, otherwise projected radius;
- curvature → `abs(curvatures[i])`;
- arc → cumulative polyline length.

Range and per-segment colors use the same series.

### D3: Lazy analysis

Curvature is the only metric that requires analysis. `needsLayerAnalysis()`
returns true for gradient-wireframe only when `colorMetric === 'curvature'`
(or the metric `arc`, which is computed from points directly and does not need
analysis). Missing analysis falls back to auto instead of failing.

### D4: UI and output

Render gains a **Gradient metric** select. SVG already replays the gradient
pass, so it automatically carries the metric colors. The existing ramp editor
and palette independence remain unchanged.

## Risks / Trade-offs

- Curvature can be noisy; the existing ramp is still the aesthetic control.
- Auto preserves current behavior, so old documents are unchanged.
- Metric is global, not per layer; per-layer color metrics remain future work.

## Open Questions

- Should metric color become per layer or per pass later?
- Should custom palette presets include a preferred metric?
