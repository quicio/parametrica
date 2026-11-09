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
| **Lampshade 180** | Decorative | Open annular shell, 180 mm tall, 170 mm base, 2 mm wall |
| **Candle Holder 80** | Functional | Tea-light recess plus deeper taper-candle hole |
| **Soap Dish 120** | Functional | Rounded 120 × 80 × 18 mm shell with three drain slots |
| **Desk Tray 160** | Functional | Rounded 160 × 90 × 25 mm tray with cable notch |
| **Napkin Holder 140** | Functional | 140 × 70 × 60 mm shell with open front/back windows |
| **Wall Planter 120** | Functional | 140 × 70 × 120 mm wall planter with keyhole and drain |
| **Wall Hook 70** | Functional | 70 mm flanged peg with two screw holes |
| **Lampshade Ring Set** | Decorative | Three concentric open shades, 180/150/120 mm, 2 mm walls, three bodies |
| **Stackable Tray 160** | Functional | 168 × 98 × 30 mm rounded tray with a locating top lip |

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
| Lampshade 180 | exportable | 1,317 mm² | 0% | Ready |
| Candle Holder 80 | exportable | 2,825 mm² | 0% | Ready |
| Soap Dish 120 | exportable | 7,768 mm² | 0% | Ready |
| Desk Tray 160 | exportable | 13,345 mm² | 0% | Ready |
| Napkin Holder 140 | exportable | 9,309 mm² | 1% | Ready |
| Wall Planter 120 | exportable | 9,032 mm² | 0% | Ready |
| Wall Hook 70 | exportable | 1,519 mm² | 0% | Ready |
| Lampshade Ring Set | exportable, 3 bodies | 2,859 mm² | 0% | Ready |
| Stackable Tray 160 | exportable | 13,345 mm² | 4% | Ready |

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

## Construction primitives

The object wave shares three preset-level primitives:

- **Rounded shell**: superellipse outer/inner cross-sections, a solid floor and
  an open top.
- **Cutter layers**: closed surfaces marked `fabricationRole: "cutter"`. They
  participate in the Manifold difference but are excluded from the technical
  canvas and SVG export.
- **Open and stepped solids**: annular shells with end caps, and solids of
  revolution with blind-hole or screw-hole cutters.

Most objects use one Manifold difference per body. Grouped recipes let one
preset combine independent boolean groups and export them as multiple bodies;
`Lampshade Ring Set` uses three outer−inner differences. `Lampshade 180` is a
through-centre shell; the rest have a solid floor.

## Product preview

Product preview is available for every exportable prepared solid, not only
lattice bodies. The renderer selection is enabled once Fabricate reports
`READY` in the 3D view.

## Next object candidates

These remain proposed; they need a compound recipe beyond independent groups.

| Candidate | Type | Why it is not in yet |
|---|---|---|
| **Modular Planter Tile** | Functional | Needs a keyed rail or interlocking dovetail and a matching wall cleat. |
| **Folding Wall Hook** | Functional | Needs a hinge/clevis and a pin, plus a union-then-difference recipe. |
| **Stackable Bowl Set** | Functional | Needs nested bowls with registration feet and separate bodies. |
| **Snap-Fit Desk Tray** | Functional | Needs a compliant snap feature and tolerance tuning. |

The next practical step is a **sequential CSG recipe**: union the hinge base,
then subtract the screw holes. Independent groups already cover multi-body
sets such as the lampshade ring.

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
