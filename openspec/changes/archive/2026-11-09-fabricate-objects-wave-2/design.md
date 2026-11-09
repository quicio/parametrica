## Objects

| Preset | Construction | Target |
|---|---|---|
| Lampshade 180 | Open annular shell, 2 mm wall | 180 mm tall, 170 mm base |
| Candle Holder 80 | Solid revolve + stepped blind holes | 80 mm tall, 60 mm wide |
| Soap Dish 120 | Rounded shell + three floor slots | 120 × 80 × 18 mm |
| Desk Tray 160 | Rounded shell + cable notch | 160 × 90 × 25 mm |
| Napkin Holder 140 | Rounded shell + front/back windows | 140 × 70 × 60 mm |
| Wall Planter 120 | Rounded shell + keyhole + drain | 140 × 70 × 120 mm |
| Wall Hook 70 | Flanged solid revolve + two screw holes | 70 mm projection, 44 mm flange |

All objects use millimetres at 1 mm per world unit and a single Manifold
difference per body.

## Product preview

`Controls.syncLatticePreview` used to publish a fabrication preview only for
lattice and cutout bodies. The product renderer therefore showed
"Build the solid preview..." for every new object.

The preview publisher now accepts any exportable prepared solid. Lattice
bodies still require the lattice report; ordinary objects require an exportable
source and a mesh.

## Acceptance

- Every object is exportable, closed and print-ready.
- Cutter layers never render as authored geometry.
- Product preview opens for a hollow object and for a cut object.
- Existing vase, lattice and export behavior is unchanged.
