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

## Mode

Loading an example does **not** switch modes automatically. Apply the preset and
open Fabricate explicitly.

## Previews

Examples use the standard preset preview pipeline. A failed preview never blocks
selection.
