## Context

The lattice network already unrolls the surface into a cylinder. Seeds were
area-weighted by R, which leaves cells slightly larger at the belly. Tubes
ended in flat caps, so junctions looked CAD-like. The perforated variant reuses
the same seeds but needs the closed shell rather than the tube solid.

## Decisions

### D1: R² seed weighting

In the unrolled `(X = theta·meanR, z)` plane the metric stretch is `R/meanR`.
A seed density proportional to R² therefore yields a roughly constant metric
cell size. Four Lloyd passes then remove most slivers. The area CV drops from
about 0.37 to about 0.26 on the 200 mm vase.

### D2: Joint spheres as one operand

Each unique vertex with degree ≥ 3 grows a low-poly sphere of radius 1.04× the
strut radius. Spheres closer than 2.15× the radius are skipped to avoid
self-intersection. All spheres are packed into one mesh operand, so the union
does not pay 300+ extra operand costs. Tubes keep flat caps; the spheres cover
the junctions.

### D3: Perforated wall

- Use the evaluated outer Surface grid to read the exact R(z).
- Reuse the Voronoi seeds over a reduced z range so holes clear the floor and
  rim.
- Each seed becomes a radial cylinder of `(cellSize − strut)/2` radius.
- Subtract all cutters from the outer−inner shell in one Manifold difference.
- `Perforated Vase 200` keeps the solid shell as authored geometry and activates
  the cutout mode in Fabricate.

### D4: Printability heuristics

`analyzePrintability` triangulates each face, classifies down-facing triangles
below the overhang threshold, excludes faces on the bed, sums bed contact and
reports a minimum feature when the source knows one. It warns above 12%
overhang area, with no bed contact, or below a 2 mm feature. It never blocks
export.

### D5: Preview

The perforated report reuses the solid preview. The select label becomes
`Authored` for cutouts; other layers are hidden so authored wireframes do not
paint over the prepared body.

## Test matrix

- Network cell-area CV stays below 0.35.
- Lattice solid remains closed/manifold with joint spheres.
- Perforated preset is exportable, 200 mm tall, 170–180 mm wide and has >50
  holes.
- Printability: cube has no overhang, 100 mm² bed contact; a down-facing face
  warns; thin features warn.
- STL triangle counts match the reports.
