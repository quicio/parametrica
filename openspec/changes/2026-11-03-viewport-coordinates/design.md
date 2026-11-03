## Context

`projectPointToView` defines the orthographic mappings:

```text
XY → horizontal x, vertical -y, depth z
XZ → horizontal x, vertical -z, depth y
YZ → horizontal -y, vertical -z, depth x
```

Quad builds four panels from a projection id only. Canvas, picking and exports
share `ViewTransform`, but no component exposes per-panel axis meaning or a
world→artboard inverse for coordinate readout.

## Decisions

### D1: One viewport descriptor

Introduce a pure descriptor used by Canvas, Quad and tests:

```text
{
  projection,
  axes: {
    horizontal: { id: 'x'|'y'|'z', label, sign: 1|-1 },
    vertical:   { id, label, sign },
    depth:      { id, label }
  },
  origin: { x, y },          // artboard space
  scale,                     // artboard units per projected unit (ortho)
  bounds,                    // world bounds
  units                      // resolved display metadata
}
```

The descriptor derives axis mapping from the projection and does not read DOM,
p5 or document state beyond the passed transform/bounds/units.

### D2: Axes and signs are explicit

YZ horizontal is `-y` on screen and vertical is `-z`. Ticks and labels MUST
respect these signs so a rightward tick is not mislabeled as positive Y.

The 3D panel shows the existing reference origin/axes only. Numeric ticks and
cursor readout are orthographic-only because perspective has no constant world
scale.

### D3: Coordinate grid and ticks

- Reuse `view.reference` for origin/axes/ground; move its controls to
  Coordinates.
- Add optional `view.coordinates`:

```text
{ enabled: boolean, grid: boolean, cursor: boolean,
  step: number|null, unitDisplay: 'auto'|'world'|'physical' }
```

- `enabled` turns on numeric ticks and values.
- `grid` adds light grid lines at tick intervals.
- Auto step chooses a 1/2/5 × 10^n world interval that produces a legible
  artboard spacing. Manual step must be finite and positive.
- Ticks are clipped per panel and skipped in capture mode.
- Labels use the active `view.units`; unitless documents never claim mm.

### D4: Cursor readout is honest

In an orthographic panel, the pointer determines the two in-plane world
coordinates; the dropped axis is unknown and displayed as `—`.

```text
XY → x, y known · z unknown
XZ → x, z known · y unknown
YZ → y, z known · x unknown
```

Quad routes the pointer to the panel under the cursor. Single Canvas uses the
active projection. No depth is inferred from the pointer, and 3D shows no
cursor coordinate readout in this slice.

### D5: Look ownership

```text
Look
├─ Camera      → projection, layout, guides, reset
├─ Canvas      → artboard, background, margin, UV Domain, Inspect, Seams
├─ Coordinates → Reference, Ground, grid, ticks, cursor readout, step/units
├─ Scale       → physical units and scales
├─ Style       → active-layer appearance
├─ Render      → pass browser, ramp
└─ Overlays    → diagnostic overlays
```

Reference and Ground move from Canvas to Coordinates. Existing persisted
section state maps `reference` to Coordinates. Canvas keeps artboard and
inspection tools.

### D6: Export and frame isolation

The coordinate overlay is UI-only. It reads the existing transform and never
mutates geometry, frame, bbox, SurfaceMapping or render data. It is skipped in
capture mode, so SVG, plotter, PNG and GIF remain unchanged.

## Risks / Trade-offs

- More overlays can clutter the canvas; defaults stay off and the style is
  quiet.
- Auto tick spacing depends on panel pixel size; manual overrides must remain
  available.
- Quad pointer routing needs panel hit testing; wrong routing would show
  misleading coordinates.
- Unit labels can be confused with geometry scaling; the section must state
  that units are display-only.
- Moving Reference/Ground changes muscle memory; section-state migration must
  be tested.

## Open Questions

- Should cursor readout appear only while the pointer is over the canvas, or
  remain pinned after leaving?
- Should the grid support a separate density for single Canvas and Quad?
- Should the coordinate overlay ever be available in exported SVG as an opt-in
  technical layer? Current decision: no.
