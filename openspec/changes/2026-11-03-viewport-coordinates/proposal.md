## Why

Look already separates Camera, Canvas, Scale, Style, Render and Overlays, but
the viewport has no explicit coordinate model. Quad panels know only a
projection id; they do not expose which world axes are horizontal, vertical or
depth, where the origin is, or how to read coordinates.

Users working with XZ/YZ planes cannot see numeric axes, grid values or cursor
coordinates. Adding another ad-hoc overlay would duplicate projection logic and
make Canvas, Quad, picking and exports drift.

## What Changes

- Add a **Coordinates** section to Look.
- Add a pure viewport descriptor shared by single Canvas and Quad panels:
  projection, horizontal/vertical/depth axes, direction signs, origin, scale
  and bounds.
- Draw orthographic axes, a coordinate grid, numeric ticks and values.
- Show cursor X/Y/Z readout for the active orthographic plane.
- Use `view.units` for display only: world values or millimetres, never an
  implicit conversion.
- Move Reference and Ground controls from Canvas to Coordinates.
- Keep the overlay UI-only and excluded from SVG, plotter, PNG and GIF.
- Preserve geometry, frame, bbox, SurfaceMapping, picking and render contracts.

## Capabilities

### New Capabilities

- `viewport-coordinates`: per-panel axis metadata, coordinate grid, ticks and
  cursor readout.

### Modified Capabilities

- `look-workspace`: Coordinates section ownership and Canvas boundary.

## Impact

- New pure viewport/coordinate descriptor and tick generator.
- P5 single/Quad drawing and pointer routing.
- Look section UI and optional `view.coordinates` defaults/sanitization.
- Unit-aware labels in `view.units`.
- Unit tests for descriptor, ticks, inverse mapping and sanitization.
- E2E for Coordinates controls, Quad panels, cursor readout and export isolation.
- No geometry, tessellation, SurfaceMapping, camera or render-pass change.

## Non-goals

- No 3D perspective cursor coordinates or depth inference.
- No viewport navigation, snapping, measuring or dimension tools.
- No new document geometry or fabrication behavior.
- No change to SVG/plotter/PNG/GIF output.
- No per-layer coordinate systems or animated axes.
