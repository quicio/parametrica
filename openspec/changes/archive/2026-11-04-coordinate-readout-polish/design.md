## Context

Orthographic readout is exact but limited. 3D has no constant scale; only a hit
on geometry can yield a world point.

## Decisions

### D1: Pinned readout

Add a `Pin` action. Pinning freezes the last valid world readout until released.
Pinned values are invalidated when the evaluation or projection changes.

### D2: 3D mode

In 3D, request a surface hit through the existing picker. If a hit exists, show
its world XYZ and source/instance identity. If no hit, show no coordinates.

### D3: Orthographic mode

Keep the existing two in-plane coordinates and `—` for the dropped axis.

### D4: Units

Use `view.units` display only; never rescale geometry.

### D5: Exports

Readout is UI-only and excluded from SVG, plotter, PNG and GIF.

## Risks / Trade-offs

- 3D readout depends on picking; no hit means no values.
- Pinned readout can become stale; revalidate on rebuild.
- More state in Coordinates; keep it UI-only.
