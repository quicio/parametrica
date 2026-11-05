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

## 3D surface-hit readout

In a single 3D view the readout is not derived from the screen plane. The
pointer is intersected with the nearest world-space surface mesh using the same
picker as the Surface Inspector. A valid hit reports all three world
coordinates:

```text
x 1.20 · y -0.40 · z 2.10
```

Empty 3D space has no depth. When no surface is hit, the readout stays absent
and never invents a Z value. Quad 3D panels keep the same rule; the orthographic
panels continue to report two in-plane values plus `—` for the dropped axis.

## Pinning

**Coordinates → Pin** stores the last valid readout and **Release** clears it.
The pinned value is drawn in the overlay and survives camera orbit while the
source geometry is unchanged. It is revalidated after evaluation or projection
changes:

- a projection or Quad/single layout change clears the pin;
- a 3D pin is cleared when its source layer or mesh disappears or is rebuilt;
- orthographic pins are cursor-plane coordinates, so they remain valid until
  the projection changes.

Pins are UI-only. They are skipped in capture mode and never enter SVG, plotter,
PNG or GIF output.

## Limitations

- Pinning in 3D requires a surface hit; there is no free-space depth.
- No snapping, measurement tools or persistent measurement history.
- Values are display-only and never change geometry or fabrication data.
