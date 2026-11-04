# Look presets and control clarity

## Looks

Look → **Looks** provides built-in visual recipes:

| Preset | Passes | Overlays | Notes |
|---|---|---|---|
| Line | stroke | none | default |
| Technical | stroke, points, tangents, normals | inflections, samples, ruler, bbox | |
| Surface | stroke, surface wireframe, surface fill | none | requires surface/mesh |
| Gradient | gradient wireframe | none | height metric |
| Diagnostic | stroke, curvature, topology | inflections, bbox | curvature metric |
| Field | signed distance | none | |
| Epicycles | stroke, epicycles | none | requires Fourier |

Presets only write view-level fields:

- `view.modes`
- `view.overlays`
- `view.colorMetric`
- `view.guides`

They never change geometry, style, units, camera or fabrication state.
Unavailable presets stay visible but disabled with a reason. **Reset Look**
applies Line and clears diagnostic overlays.

## Render control semantics

Each pass row has one primary control:

- **Checkbox** — enables or disables the pass.
- **Opacity** — a labeled secondary range, disabled while the pass is off.
- **N/A** — the pass cannot apply to the current visible geometry.
- A one-line reason explains why it is unavailable.

Configured passes are preserved when they become temporarily inapplicable.
Changing from a surface document to a 2D curve document keeps `surface-fill` in
`view.modes`; the pass is skipped until surface geometry returns.

Examples of reasons:

- Surface passes: `Requires surface or mesh geometry`
- Epicycles: `Requires the Fourier generator`
- Control Polygon: `Requires spline control points`
- Negative Space: `Requires a closed curve`

## Applicability outside Render

- Canvas: UV Domain, Inspect and Seams are disabled on layers without
  surface/mesh geometry, with a visible reason.
- Coordinates: reference, values, grid and cursor readout are disabled on
  non-spatial layers.

The goal is to never present an active-looking control that cannot affect the
current layer.
