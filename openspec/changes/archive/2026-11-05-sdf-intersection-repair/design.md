## Context

`repairSelfIntersections` currently resolves pairs with grid remesh. Manifold
can build a watertight iso-surface via `levelSet`, but needs a signed distance
function. The sign must handle overlapping shells correctly.

## Decisions

### D1: SDF

Build a triangle BVH for the repaired source. For each point:

```text
distance = closest point on any triangle
sign = windingNumberMulti(point) > 0.5 ? + : -
sdf = sign * distance
```

Positive is inside, matching Manifold.levelSet.

### D2: Multi-ray winding

Parity fails on overlapping shells: a point inside two shells has an even
number of crossings and looks outside. Use signed ray crossings (triangle
normal vs ray direction) in three fixed directions and take the median. This
keeps overlapping unions inside and folded surfaces stable.

### D3: Manifold.levelSet

- Bounds = source bbox expanded by 2 × edge length.
- `edgeLength = max(bbox diagonal) / resolution`.
- `level = 0`.
- `tolerance = edgeLength × 0.1` by default.
- Call `Manifold.simplify` before output conversion to remove slivers.
- Convert with the existing merge-vector-aware `fromManifold`.

### D4: Trust boundary

Manifold guarantees manifold output. Its float32 level-set output can trip the
approximate local self-intersection detector on tiny slivers. Meshes tagged
`manifoldGuaranteed` record the local check as `checked:false` and are not
rejected for that specific detector. Closed, manifold, orientation, degenerate
and volume checks still run.

This is explicit in the validation meta, UI report and docs.

### D5: Strategies

```text
none | sdf | remesh | auto
```

- `auto` prefers `sdf` when Manifold is ready; otherwise remesh.
- `sdf` fails with `not-ready` before initialization or a structured error.
- `remesh` remains the approximate fallback.

### D6: Fabrication

The SDF result replaces only the fabrication source. Render geometry is
unchanged. The report includes strategy, pair count, edge length, volume delta
and triangle delta. Failed/empty results disable export.

## Test matrix

- Enneper Surface: SDF valid at 32/48/64; volume converges.
- Overlapping cubes: volume near 12; winding sign keeps overlap inside.
- Clean mesh: no change.
- Auto prefers SDF when ready; remesh explicit still works.
- Determinism.
- Fabrication export.
- E2E SDF repair and export.
