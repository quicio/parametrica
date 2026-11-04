# Viewport coordinates

## Scope

Look → **Coordinates** owns the world reference and the coordinate overlay:

- Reference origin and XYZ axes
- Optional ground plane
- Orthographic ticks, values and grid
- Cursor X/Y/Z readout
- Automatic or manual tick step
- World or physical (mm) value display

The overlay is UI-only. It is skipped in capture mode and never enters SVG,
plotter, PNG or GIF output.

## Axis mapping

| Panel | Horizontal | Vertical | Depth |
|---|---|---|---|
| XY | X (+ right) | Y (+ up) | Z (unknown) |
| XZ | X (+ right) | Z (+ up) | Y (unknown) |
| YZ | Y (− right) | Z (+ up) | X (unknown) |

Axis signs follow the real world mapping. In YZ, screen-right is negative Y,
so ticks are labelled accordingly rather than relabelled as positive Y.

## Ticks and units

- Automatic spacing uses a 1/2/5 × 10^n world interval.
- A finite positive manual step overrides it.
- Ticks and grid lines are clipped to their panel.
- Values use canonical world units by default.
- When `view.units` declares a physical world scale, **Auto** and **Physical**
  display millimetres. Unitless documents never claim millimetres.
- Displaying units never rescales geometry.

## Cursor readout

The pointer determines only the two in-plane coordinates. The dropped axis is
shown as `—`:

```text
XY → x, y known · z unknown
XZ → x, z known · y unknown
YZ → y, z known · x unknown
```

Quad routes the pointer to the panel under the cursor. The 3D panel shows the
reference axes but no numeric ticks or cursor world coordinates, because
perspective has no constant world scale.

## Configuration

`view.coordinates` is optional and off by default:

```js
{
  enabled: false,      // ticks and values
  grid: true,          // light grid at tick intervals
  cursor: false,       // cursor readout
  step: null,          // null = automatic
  unitDisplay: 'auto'  // auto | world | physical
}
```

Unknown values sanitize safely and old documents remain valid.

## Verification

- `renderer.coordinateReadoutAtCanvas(x, y)` resolves the same readout used by
  the overlay, for tests and future inspectors.
- Unit tests cover axis mapping, signs, inverse coordinates, tick spacing,
  unit formatting and sanitization.
- E2E covers the Coordinates controls, single/Quad readout and export
  isolation.
