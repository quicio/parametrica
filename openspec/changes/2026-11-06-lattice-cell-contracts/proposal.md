## Why

The current lattice uses a periodic Voronoi diagram in a cylinder of nominal
radius. Cell size still depends on the seed and on the top/rim crop: the real
`Lattice Vase 200` preset measured a cell-area CV of 0.357, while the test
scenario measured 0.257. There is no explicit contract for nodes, edges, cells
or openings, so preview, Fabricate and the perforated mode reconstruct related
but separate data.

Phase 2 needs stable, measurable cell topology and opening geometry. Without
that contract, organic struts and joints would have to rediscover the network
inside the solid builder.

## What Changes

- Add `LatticeSpec`: a serializable, normalized contract for surface, cell
  field, clearance and budget.
- Add `LatticeNetwork`: deterministic nodes, edges, cells, openings, bands and
  statistics.
- Replace the nominal-radius/R² heuristic with an area-targeted distribution:
  power diagram + surface-area Lloyd iterations. The unrolled metric remains an
  approximation; cell areas are measured on the surface, distances are not
  geodesic.
- Add controlled organic parameters: density, irregularity, relaxation, aspect,
  boundary mode and minimum opening.
- Compute opening polygons by insetting cells by `strutDiameter/2`; estimate
  their free width and merge/report cells below `minOpeningWidth`. Area is
  diagnostic, not the manufacturing criterion.
- Make preview, Fabricate and perforation consume the same network builder and
  cache.
- Extend the `surface-lattice` generator with optional parameters while
  preserving its id, `curve3d` preview and existing presets.

## Capabilities

### New Capabilities

- `lattice-spec`: normalized spec, metric-aware cell field, network and opening
  contract.

### Modified Capabilities

- `surface-lattice`: the generator consumes and exposes the new spec and cell
  controls.

## Impact

- `src/generators/surfaceLattice.js`
- `src/geometry/latticeNetwork.js`
- `src/application/fabricationSource.js`
- `src/geometry/perforation.js`
- tests, presets, docs

## Non-goals

- No organic struts/joints yet (Phase 2).
- No finish quality profiles in Phase 1; the existing repair/SDF `quality` is
  not reused for lattice finish.
- No general Surface/UV lattice yet; this phase stays on revolution.
- No geodesic Voronoi; the approximation is documented and benchmarked.
- No new renderer, no PBR, no slicer.
- No document version bump; all new fields are optional.
