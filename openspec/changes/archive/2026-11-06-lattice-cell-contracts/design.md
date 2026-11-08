## Context

The architectural design lives in `docs/lattice-organic-architecture.md`. This
change implements Phase 1: the cellular contract and distribution. It does not
change the tube/joint construction yet.

## Decisions

### D1: Derived spec, not document geometry

`LatticeSpec` is normalized from generator parameters. It is serializable but
not stored as a separate document object. The document keeps parameters; the
network and solid are derived. `algorithmVersion` participates in the hash and
ID identity.

### D2: Area-targeted power diagram

Seeds are sampled on the actual lateral surface and refined in a power diagram
in `(X = θ·R_ref, z)`. Cell area is integrated on the surface. Weights are
updated with `w_i -= κ(area_i - targetArea_i)` and positions with the surface
area centroid.

`X = θ·R_ref` is an **unrolled approximation**, not a geodesic metric. The
area target is corrected; seed distances and bisectors are not. Phase 1 accepts
this approximation because it controls size and organicity at low cost. A
geodesic Voronoi is out of scope unless benchmarks prove the approximation
insufficient.

### D3: Controlled organic parameters

`density`, `irregularity`, `relaxation`, `aspect` and `seed` are explicit.
Irregularity comes from a seeded blue-noise/jitter field, not from unconstrained
noise. Boundary cells are flagged and excluded from the interior CV.
`targetSize` is a characteristic cell pitch, not an opening size. Phase 1 does
not include strut radius, joint style or finish quality; those belong to
Phase 2.

### D4: Openings are first-class

Each cell is inset by `strutDiameter/2`. The design criterion is the estimated
**free width** (`minOpeningWidth`), not area: an elongated hole can have enough
area and insufficient width. `LatticeCell` carries the cell polygon, the
opening polygon, the estimated width and the area as a diagnostic. The estimate
is not a manufacturing guarantee; Phase 2 validates the final solid with a
gauge.

### D5: One builder, one cache

Preview, Fabricate and perforation call `buildLatticeNetwork(spec)`. The cache
is keyed by the canonical spec hash. Camera/style changes do not invalidate;
cell parameters and seed do.

### D6: Compatibility

`surface-lattice` keeps its id and existing params. `cellSize` is normalized to
`targetSize`; no document rename. New params default to `density=1`,
`irregularity=0.15`, `relaxation=3`, `aspect=1`, `boundaryMode='flag'`,
`minOpeningWidth=2`. `Lattice Vase 200` migrates; `Solid Vase 200` is untouched;
`Perforated Vase 200` uses the same network seeds. Finish quality is not part of
this phase.

## Algorithm summary

1. Compute lateral area and mean radius.
2. Estimate cell count from `area / targetSize²`.
3. Sample seeds with density and irregularity.
4. Build a power diagram with half-plane clipping.
5. Iterate: compute surface cell areas, update weights and centroids.
6. Flag boundary cells; compute interior CV.
7. Inset cells by `strut/2`; merge/report invalid openings.
8. Emit nodes, edges, cells, bands, openings and stats.
9. Emit one `Curve3D` preview per edge.

## Test matrix

- Same spec + algorithmVersion → identical network hash and curves.
- Seed change → different layout, bounded cell-size range.
- Interior CV target and target-size tolerance are measured; thresholds are
  provisional until the real presets are benchmarked.
- Density and target size are monotonic.
- Opening width ≥ minOpeningWidth or reported/merged; area is diagnostic.
- Boundary cells excluded from CV.
- 15/20/25 mm presets still export.
- Preview/Fabricate use the same network hash.
- IDs are only stable within a generation.

## Acceptance

See the spec and `docs/lattice-organic-architecture.md` §3.8–3.9.
