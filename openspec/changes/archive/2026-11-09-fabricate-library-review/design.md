## Definition of fabricable

A Fabricate preset must:

1. evaluation without errors;
2. `report.exportable === true`;
3. a closed body with positive volume and triangles;
4. bed contact > 0 mm²;
5. overhang ratio < 20% at the default orientation;
6. no intentional "challenge" preset in the category.

The review used `buildFabricationReport` with the real Manifold preparation for
every preset.

## Removed

| Preset | Reason |
|---|---|
| SDF Enneper | Exportable, but a thin repaired surface: about 0.8 mm average thickness for a 50 mm wide shape, with no bed contact. Not a reliable print. |
| Möbius Challenge | Not exportable: 288 open boundary edges. It belongs in a lab note, not the Fabricate library. |

## Kept technical examples

Solid Torus, Twin Tori, Boolean Union, Boolean Difference and Cap Catenoid
remain because they are closed, exportable and demonstrate indispensable
capabilities. The torus family needs supports or reorientation; the report says
so explicitly.

## Added objects

| Preset | Type | Target |
|---|---|---|
| Pencil Cup 100 | Functional | 100 mm tall, 65 mm wide, 3 mm wall, flat base |
| Planter 120 | Functional | 120 mm tall, 110 mm base, 4 mm wall |
| Napkin Ring 50 | Functional | 48 mm wide, 30 mm tall, 3 mm wall, through-hole |
| Coaster 90 | Functional | 90 mm diameter, 6 mm solid slab |
| Bud Vase 160 | Decorative | 160 mm tall, soft waist, 2.5 mm wall |
| Twisted Totem 220 | Abstract | 220 mm tall, five-lobed solid, flat base |
