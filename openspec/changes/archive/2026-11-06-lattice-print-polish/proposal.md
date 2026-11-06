## Why

The first lattice shipped as a clean but slightly uneven tube basket with flat
joints. The reference object is more regular and organic, and users still had
to open a slicer to discover overhangs or thin features.

## What Changes

- Weight Voronoi seeds by R² and use four Lloyd passes so cells stay closer to
  the requested millimetre size across the vase height.
- Round three-way joints with low-poly spheres packed into one union operand.
- Add a `Perforated Vase 200` example: keep the closed 2.5 mm shell and subtract
  seeded radial through-holes.
- Add heuristic printability checks to every Fabricate report:
  - overhang area beyond 50° (bed faces excluded);
  - bed contact area;
  - minimum feature when known;
  - warnings in the Fabricate checks.
- Let the Solid preview also show perforated bodies.

## Capabilities

### New Capabilities

- `perforated-wall`: seeded through-holes in a closed shell.
- `printability-checks`: overhang, bed and feature heuristics.

### Modified Capabilities

- `surface-lattice`: uniform cell weighting and rounded joints.
- `lattice-preview`: perforated bodies and authored-vs-solid labelling.

## Impact

- Lattice network/solid builders, perforation builder
- Fabrication source, report and UI
- New preset and catalog metadata
- Tests, docs and preset counts

## Non-goals

- No slicer engine or support generation.
- No change to the solid or lattice export contracts.
- No Voronoi-shaped cutouts yet; the perforated variant uses round holes.
