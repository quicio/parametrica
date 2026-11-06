## Context

The vase is a surface of revolution `R(v)` with `z = v·height`. A cellular
wall can be described entirely by a network of edges on that surface. The
renderer already supports world `curve3d` geometry, and Fabricate already owns
the Manifold/worker path.

## Decisions

### D1: Network in the unrolled cylinder

Cells are computed in `(X, Z)` with `X = theta · meanRadius`. This keeps cell
edges roughly isotropic in millimetres while the actual circumference varies
with height. Density is area-weighted by rejection-sampling `Z ∝ R(z)`.

The diagram is periodic: each seed is clipped against every neighbour and its
`±2π` copies, so the seam has no artificial vertical strut.

### D2: Two Lloyd passes

Raw seeds leave slivers. Two centroidal relaxation passes even out the cells
and bring the mean edge length near the requested cell size. Edges shorter
than `max(1.5, cellSize·0.1)` are dropped; adjacent tubes overlap enough to
cover the resulting sub-millimetre vertex gaps.

### D3: Display and fabrication are the same network

The generator emits the network as `curve3d`. The viewport renders it directly.
Fabricate reads the same world curves from the evaluated layer and sweeps them
into tubes. There is no hidden cutter layer and no document schema change.

### D4: Solid assembly

- Each curve becomes a closed tube of `strut` diameter.
- A cylinder floor covers `z = 0` through the bottom ring.
- A torus rim sits at `height − rimMinor`, so its top is exactly `height`.
- The network stops half a rim below the mouth, keeping the total height at
  200 mm.
- Manifold union produces one body. Float32 output can leave a micro-triangle
  open at near-coincident junctions; only loops under 0.1 mm are capped, and
  larger holes remain validation failures.

### D5: Heavy-work placement

`lattice` is part of the fabrication preparation, so `isHeavyFabrication`
routes it to the existing cancellation/progress worker. The 20 mm preset
builds in roughly 2–3 s; a 15 mm network takes about 5 s.

## Test matrix

- Network is deterministic for a seed and changes with a different seed.
- Edges sit on `R(z/height)`; the network spans floor to mouth.
- Cell count and edge lengths stay near the requested size.
- The small lattice solid is closed, manifold and has positive volume.
- `Lattice Vase 200` is exportable, 200 mm tall and about 175 mm wide.
- Binary STL matches the report triangle count.
