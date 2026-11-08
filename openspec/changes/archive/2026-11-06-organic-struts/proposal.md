## Why

The current lattice is structurally valid but visually technical: tubes have a
constant radius, flat caps and low-poly sphere joints. There is no blending, no
variable cross-section, and no explicit quality/performance contract. The
reference object is a sculptural, organic vessel, not a mechanical grid.

Phase 1 will provide stable nodes, edges, cells and opening polygons. Phase 2
uses that topology to generate curved centerlines, variable-radius struts and
organic joints while preserving the silhouette, apertures and printability.

## What Changes

- Add `OrganicStrutSpec` and `LatticeSolidSpec` / `LatticeSolidResult`.
- Convert each edge into a centripetal Catmull-Rom centerline in surface
  coordinates `(θ,z)/(u,v)`, with seam handling, surface tolerance, adaptive
  sampling and controlled tangents.
- Support variable strut radius (constant, taper, safe expression) with
  min/max clamps and circular sections.
- Add joint styles: `technical`, `rounded`, `blend`, `auto`.
- Define a localized blend contract; the first candidate is local SDF +
  `Manifold.levelSet`, benchmarked before becoming the default. `rounded`
  remains the fallback.
- Add envelope modes (`centerline` / `outer`) and opening preservation.
- Add finish profiles (`draft`, `standard`, `high`) for preview and export,
  separate from the existing repair/SDF `quality`.
- Add `Organic Lattice Vase 200` while keeping `Lattice Vase 200` as the
  technical baseline.
- Extend print checks with measured strut, joint and opening **width** (gauge);
  opening area stays diagnostic.

## Capabilities

### New Capabilities

- `organic-struts`: curved centerlines, variable radius, organic joints,
  envelope/opening preservation and quality profiles.

### Modified Capabilities

- `surface-lattice`: its fabricated solid uses the organic strut builder and
  exposes finish controls.
- `printability-checks`: adds strut/joint/opening-width measurements.

## Impact

- `src/geometry/latticeSolid.js` or new `src/geometry/lattice/*`
- `src/generators/surfaceLattice.js`
- `src/application/fabricationSource.js`
- `src/geometry/printChecks.js`
- presets, tests, docs

## Non-goals

- No new mode, no new renderer, no new dependency.
- No global SDF of the whole lattice.
- No fillet of arbitrary meshes.
- No slicer or support generation.
- No general Surface/UV lattice yet.
- No final commitment to one SDF implementation.
- No silent quality upgrade.
