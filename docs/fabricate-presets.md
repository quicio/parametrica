# Fabricate example presets

The preset library includes a **Fabricate** category for exploring the
fabrication controls without manual setup.

| Preset | Type | What it demonstrates |
|---|---|---|
| **Solid Torus** | Technical | Closed solid, mm scale, 3MF output |
| **Twin Tori** | Technical | Two disjoint bodies, composition scope, 3MF objects |
| **Boolean Union** | Technical | Manifold union of overlapping tori |
| **Boolean Difference** | Technical | Manifold difference with one result body |
| **Cap Catenoid** | Decorative | Open surface + Repair + automatic caps |
| **Solid Vase 200** | Decorative | Hollow vase: 200 mm tall, ~175 mm diameter, ~135 mm mouth, 2.5 mm wall |
| **Lattice Vase 200** | Decorative | Openwork vase: 200 mm tall, 20 mm Voronoi cells, 3.5 mm struts |
| **Organic Lattice Vase 200** | Decorative | Organic 20 mm cells, rounded joints, 3.5 mm strut envelope |
| **Perforated Vase 200** | Decorative | Solid wall with 208 seeded 16.5 mm through-holes |
| **Pencil Cup 100** | Functional | 100 mm tall cup, 65 mm wide, 3 mm wall, flat base |
| **Planter 120** | Functional | 120 mm tall pot, 110 mm base, 4 mm wall, flat foot |
| **Napkin Ring 50** | Functional | 48 mm wide, 30 mm tall, 3 mm through-wall ring |
| **Coaster 90** | Functional | 90 mm solid disc, 6 mm profile |
| **Bud Vase 160** | Decorative | 160 mm tall slim vase, soft waist, 2.5 mm wall |
| **Twisted Totem 220** | Abstract | 220 mm solid, five-lobed twisted profile, flat base |

SDF Enneper and Möbius Challenge were removed: the former is a thin repair demo
and the latter is intentionally non-exportable. The remaining technical solids
are clearly labelled because the torus family needs supports or reorientation.

## Fabricability review

The review used the real `buildFabricationReport` and Manifold preparation. A
preset stays in the category only when it is exportable, closed and has positive
volume. Functional and decorative objects must also have bed contact and stay
below the 20% overhang warning. Technical torus/boolean solids may need
supports; the report surfaces that instead of hiding it.

| Preset | Status | Bed contact | Overhang | Notes |
|---|---|---:|---:|---|
| Solid Torus | exportable | 0 mm² | 25% | Needs supports or reorientation |
| Twin Tori | exportable, 2 bodies | 0 mm² | 25% | Needs supports |
| Boolean Union | exportable | 0 mm² | 19% | Needs supports |
| Boolean Difference | exportable | 0 mm² | 25% | Needs supports |
| Cap Catenoid | exportable | 872 mm² | 5% | Ready |
| Solid Vase 200 | exportable | 6,675 mm² | 0% | Ready |
| Lattice Vase 200 | exportable | 6,825 mm² | 9% | Ready |
| Organic Lattice Vase 200 | exportable | 6,828 mm² | 9% | Ready |
| Perforated Vase 200 | exportable | 6,675 mm² | 2% | Ready |
| Pencil Cup 100 | exportable | 3,215 mm² | 0% | Ready |
| Planter 120 | exportable | 9,497 mm² | 0% | Ready |
| Napkin Ring 50 | exportable | 424 mm² | 0% | Ready |
| Coaster 90 | exportable | 6,357 mm² | 0% | Ready |
| Bud Vase 160 | exportable | 1,017 mm² | 0% | Ready |
| Twisted Totem 220 | exportable | 2,178 mm² | 0% | Ready |

The torus/boolean family has no flat bed face. They remain as closed technical
examples because they are useful for booleans and 3MF multi-body export, and
the report surfaces the support requirement instead of hiding it.

## Defaults

Every example sets:

- `view.units` to millimetres with an explicit scale. Object presets use 1 mm
  per world unit; the torus/boolean demos use 10 mm per world unit;
- `view.fabrication` with format/quality and the relevant repair, cap or boolean
  settings.

## Expected results

- **Solid Torus**: exportable immediately.
- **Twin Tori**: two bodies; 3MF writes two objects.
- **Boolean Union / Difference**: Manifold strategy; one body.
- **Cap Catenoid**: Repair + caps; exportable.
- **Solid Vase 200**: exportable hollow shell; outer and inner surfaces capped and subtracted with Manifold.
- **Lattice Vase 200**: the viewport shows the strut network; Fabricate builds and exports one closed lattice solid.
- **Perforated Vase 200**: a solid wall with round through-holes; Fabricate builds and exports the cut shell.
- **Pencil Cup 100 / Planter 120 / Bud Vase 160 / Napkin Ring 50**: outer and
  inner surfaces are capped and subtracted with Manifold, producing a hollow
  body with a flat floor and bed contact.
- **Coaster 90 / Twisted Totem 220**: one capped solid surface with a flat base.

## Next object candidates

These are proposed, not yet implemented. They need a small fabrication feature
or a new generator path before they can join the category.

| Candidate | Type | Why it is not in yet |
|---|---|---|
| **Lampshade 180** | Decorative | Needs a thin open-ended shell with annular caps, not a closed solid. |
| **Soap Dish 120** | Functional | Needs an off-axis bowl and drainage slots; current revolve helper is axisymmetric. |
| **Candle Holder 80** | Functional | Easy once a stepped blind hole is available without a through-cut. |
| **Modular Planter Tile** | Functional | Needs a flat-backed wall planter and a mounting key/boolean. |
| **Desk Tray** | Functional | Needs a rounded rectangular shell and compartment booleans; not a surface of revolution. |
| **Wall Hook** | Functional | Needs a load-bearing bracket and a screw-counterbore operation. |
| **Napkin Holder** | Functional | A slotted box; needs rectangular wall construction rather than revolve. |
| **Lampshade Ring Set** | Decorative | Same open-shell limitation as Lampshade 180. |

The next practical step is a **rectangular shell helper**: outer box minus inner
box with optional through-slots. That unlocks trays, holders, wall planters and
a proper soap dish without changing the fabrication contracts.

## Lattice example

`Lattice Vase 200` explores the cellular wall from the reference photo.

- The generator samples a periodic **Voronoi** network on the surface of
  revolution. Seeds are area-weighted by R² and four Lloyd passes even out the
  cells across the height.
- `Cell size` is the nominal cell pitch on the surface; `Seed` changes the
  layout without changing the density.
- The viewport draws one curve per cell edge, so the network reads as a
  wireframe lattice.
- In Fabricate, every curve becomes a closed tube of `Strut` diameter. A solid
  floor and a rim ring close the ends, and Manifold unions everything into one
  body. Low-poly spheres at three-way junctions round the joints; the sphere
  mesh is one operand so the union stays fast.
- The union occasionally leaves a microscopic crack at a near-coincident
  junction; the builder caps only microscopic loops and rejects larger holes.
- The lattice stops half a rim below the mouth and the floor starts at `z = 0`,
  so the assembled body is exactly 200 mm tall.
- Strut centerlines sit half a strut inside the nominal profile, so the tube
  envelope keeps the 175 mm outer diameter.

Suggested starting values: `Cell size 20`, `Strut 3.5`, `Rim 4`, `Floor 3`.

## Perforated wall

`Perforated Vase 200` is the alternative to the strut basket: keep the closed
2.5 mm shell and subtract round holes.

- Seeds come from the same periodic Voronoi network, but only their positions
  are used.
- Each seed becomes a radial cylinder of `(Cell size − Strut) / 2` radius
  through the wall; 20 mm cells and 3.5 mm struts produce 16.5 mm holes.
- Holes stop short of the floor and the rim, so both stay solid.
- The source is the normal outer−inner Boolean shell; the cutters are subtracted
  in one Manifold difference.

## Printability checks

Every Fabricate report includes a heuristic printability summary:

- overhang area beyond 50° (bed-contact faces excluded);
- bed contact area;
- minimum feature size when the source reports one.

These are not a slicer; they surface the two things a slicer would otherwise
surprise the user with. `Print checks` lists warnings such as a thin strut or a
large overhang area.

## Lattice preview

When the lattice report is ready, Fabricate can mirror the prepared body into
the canvas:

- **Network** (or **Authored** for the perforated mode) draws the authored
  centerlines or shell.
- **Solid** draws the prepared mesh with the depth-banded preview pass.

The solid preview uses a mesh simplified for display; STL/3MF always export the
full-resolution source. Camera drags and timeline playback temporarily fall
back to the network so orbiting stays responsive. The choice is stored in
`view.fabrication.latticePreview`.

## Camera and vase orientation

- The 3D camera orbits the world origin: **yaw** turns the eye around **+Z**,
  **pitch** raises or lowers it, and **+Z stays vertical on screen**.
- Height runs along **+Z**, with the mouth at the high-Z end.
- Every cross-section is a circle around Z, so front and side silhouettes match.
- Because the exported mesh is Z-up, a slicer opens the vase standing on the
  bed.

## Mode

Loading an example does **not** switch modes automatically. Apply the preset and
open Fabricate explicitly.

## Previews

Examples use the standard preset preview pipeline. A failed preview never blocks
selection.
