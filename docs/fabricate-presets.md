# Fabricate example presets

The preset library includes a **Fabricate** category for exploring the
fabrication controls without manual setup.

| Preset | What it demonstrates |
|---|---|
| **Solid Torus** | Closed solid, mm scale, 3MF output |
| **Twin Tori** | Two disjoint bodies, composition scope, 3MF objects |
| **Boolean Union** | Manifold union of overlapping tori |
| **Boolean Difference** | Manifold difference with one result body |
| **Cap Catenoid** | Open surface + Repair + automatic caps |
| **SDF Enneper** | Self-intersection repair through Manifold SDF |
| **Möbius Challenge** | Non-orientable/open limits and next-action guidance |
| **Solid Vase 200** | Hollow vase of revolution: 200 mm tall, ~175 mm diameter, ~135 mm mouth, 2.5 mm solid wall |

## Defaults

Every example sets:

- `view.units` to millimetres with `mmPerWorldUnit = 10`;
- `view.fabrication` with format/quality and the relevant repair, boolean or SDF
  settings.

## Expected results

- **Solid Torus**: exportable immediately.
- **Twin Tori**: two bodies; 3MF writes two objects.
- **Boolean Union / Difference**: Manifold strategy; one body.
- **Cap Catenoid**: Repair + caps; exportable.
- **SDF Enneper**: SDF strategy; exportable after the worker finishes.
- **Solid Vase 200**: exportable hollow shell; outer and inner surfaces capped and subtracted with Manifold.
- **Möbius Challenge**: intentionally blocked. It demonstrates the validation
  and next-action guidance instead of pretending the mesh is fabricable.

## Vase orientation

- Height runs along **+Y**, with the mouth at the high-Y end.
- The starting 3D camera looks from the far side of the XY plane, so the vase
  opens upward instead of appearing upside down.
- Every cross-section is a circle around Y, so front and side silhouettes match.
- The exporter keeps document axes. Since the height is on Y, a slicer that
  assumes Z-up shows the vase on its side until it is rotated 90° about X.

## Mode

Loading an example does **not** switch modes automatically. Apply the preset and
open Fabricate explicitly.

## Previews

Examples use the standard preset preview pipeline. A failed preview never blocks
selection.
