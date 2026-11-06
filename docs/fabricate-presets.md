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
| **Lattice Vase 200** | Openwork vase: 200 mm tall, 20 mm Voronoi cells, 3.5 mm struts, solid floor and rim |
| **Perforated Vase 200** | Solid-wall vase with 208 seeded 16.5 mm through-holes, 3.5 mm struts |

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
- **Lattice Vase 200**: the viewport shows the strut network; Fabricate builds and exports one closed lattice solid.
- **Perforated Vase 200**: a solid wall with round through-holes; Fabricate builds and exports the cut shell.
- **Möbius Challenge**: intentionally blocked. It demonstrates the validation
  and next-action guidance instead of pretending the mesh is fabricable.

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
