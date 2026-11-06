## Context

Phase 1 defines `LatticeSpec` and `LatticeNetwork` with nodes, edges, cells and
opening polygons. The full architectural design is in
`docs/lattice-organic-architecture.md`. This change builds the solid from that
network.

## Decisions

### D1: Centripetal Catmull-Rom centerlines

Each edge becomes a centripetal Catmull-Rom curve in surface coordinates
`(θ,z)` or `(u,v)`. The seam is unwrapped, samples are mapped to the surface,
and a 3D fallback must project back within `surfaceTolerance` and report the
deviation. Tangents are derived from the edge and incident directions; sampling
is adaptive by chord deviation. This is cheap, deterministic and
dependency-free.

### D2: Variable radius, circular section

`radiusAt(t)` supports constant, taper and safe expression profiles, clamped to
`[min, max]`. Sections stay circular in Phase 2; the contract leaves room for
elliptical sections later.

### D3: Joint styles with fallback

- `technical`: current low-poly sphere.
- `rounded`: higher-resolution sphere.
- `blend`: localized smooth union; the first candidate is local SDF +
  `Manifold.levelSet`, to be benchmarked.
- `auto`: an allowed style selected by node/quality budget, reported.

Blend is local to selected degree ≥ 3 nodes, not global. The local region
contains the incident segments up to `jointRadius + blendRadius + overlap`;
tubes overlap the joint volume to avoid gaps. A blend that fails or would close
an opening falls back to `rounded` and reports the node/reason. No silent
degradation. Manifold/levelSet are the primary guarantee; post-processing clears
`manifoldGuaranteed` and revalidates.

### D4: Envelope and openings

`envelope` is explicit (`centerline` or `outer`); the preset no longer hides a
1.75 mm subtraction inside the profile. The builder checks the outer envelope
and the opening **width** with a gauge before declaring the solid valid: a
capsule of diameter `minOpeningWidth` through the opening centroid, oriented by
the local normal, must not intersect the solid beyond tolerance. The network
estimate is not a manufacturing guarantee.

### D5: Quality profiles

`draft` (preview/quick), `standard` (default Fabricate), `high` (export) set
curve samples, radial segments, joint style, blend resolution and budgets. The
existing `view.fabrication.quality` is repair/SDF resolution; finish quality is
a separate serialized field (proposed `finishQuality`). The main thread resolves
it, the worker receives it in `preparation`, the report records it, and export
uses it. Preview shares the source profile and may simplify only the display
mesh. No silent upgrade. Field name/scope is a pending decision.

### D6: Preset

Keep `Lattice Vase 200` technical and add `Organic Lattice Vase 200` with an
organic joint style validated by the benchmark (blend if it passes), a separate
finish profile, controlled irregularity and the outer envelope at 175 mm.
`Perforated Vase 200` is untouched.

### D7: Validation and manufacturing

The result must be closed, manifold, oriented, positive volume, and free of
unreported self-intersections. Print checks report measured strut, joint and
opening-width minima and overhang. The worker runs the selected finish quality;
fallback/failure is explicit; post-processed geometry clears the Manifold trust
flag and revalidates.

## Algorithm summary

1. Read the Phase 1 network.
2. For every edge, build a curved centerline and adaptive samples.
3. Sweep a circular section with radius per sample; clamp the minimum.
4. Build technical/rounded joints or local blend meshes.
5. Union tubes + joints + floor + rim with Manifold.
6. Validate; if blend fails, retry with rounded and report.
7. Check envelope, openings, min strut, overhang.
8. Return `LatticeSolidResult` with provenance and stats.

## Test matrix

- Catmull-Rom in surface coordinates, seam, surface tolerance, no overshoot,
  adaptive sampling.
- Radius clamp and monotonic taper.
- Technical/rounded/localized-blend joint validity, overlap, fallback.
- Opening width gauge; envelope; min strut/joint.
- Finish quality reaches worker/preview/export; no silent upgrade; determinism
  and budgets.
- SDF-vs-rounded benchmark; 15/20/25 mm.
- `Organic Lattice Vase 200` export.
- Regression of `Solid Vase 200`, `Perforated Vase 200`, `Lattice Vase 200`.

## Acceptance

See the spec and `docs/lattice-organic-architecture.md` §4.10–4.11.
