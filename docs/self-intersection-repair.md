# Self-intersection repair

Manifold is the primary CSG engine but requires manifold input. Self-intersecting
meshes are repaired with a winding-sign SDF and `Manifold.levelSet`; the old
grid remesh remains as a fast fallback.

## Strategies

`view.fabrication.selfIntersections`:

```text
none | auto | sdf | remesh
```

- `auto` (default when repair is enabled): SDF when Manifold is ready; remesh
  otherwise.
- `sdf`: BVH + winding SDF → `Manifold.levelSet`.
- `remesh`: the previous deterministic grid remesh with feature projection.
- `none`: detect and report pairs without changing geometry.

The resolution input controls the SDF grid / remesh resolution.

## SDF

1. Build a triangle BVH for the repaired source.
2. For each point, compute the closest surface distance.
3. Compute a **multi-ray winding number**:
   - parity is not enough: a point inside two overlapping shells has an even
     crossing count and would look outside;
   - signed ray crossings in three fixed directions, median value.
4. `sdf = (winding > 0.5 ? +1 : -1) × distance`.
5. Pass the SDF, expanded bounds, edge length and tolerance to
   `Manifold.levelSet`.
6. Simplify the level set, convert back, and validate.

Manifold's level set uses a body-centered cubic grid and produces a watertight
manifold. It is still an approximation: fine features and sharp edges may be
smoothed.

## Trust boundary

Manifold guarantees manifold output. Its float32 level set can trip our
approximate local self-intersection detector on tiny slivers. Meshes tagged
`manifoldGuaranteed` record the local check as `checked:false`; closed,
manifold, orientation, degenerate-face and volume checks still run.

This is explicit in validation metadata, the repair report and this document.

## Reference measurements

Node, development hardware:

```text
Enneper Surface
  resolution 32: ~2.6 s, 1966 triangles, volume 1.81
  resolution 48: ~7.9 s, 4838 triangles, volume 2.22
  resolution 64: ~14.1 s, 9218 triangles, volume 2.36

Overlapping cubes
  resolution 32: ~0.3 s, 1204 triangles, volume 11.99
  resolution 48: ~0.6 s, 1852 triangles, volume 12.00
```

Resolution trades fidelity for time. The SDF is deterministic.

## Limits

- Approximate reconstruction; no exact topology-preserving split.
- Sharp features are not constrained.
- Manifold must be initialized for `sdf`; otherwise `auto` falls back to remesh.
- `manifoldGuaranteed` trusts Manifold for self-intersection checking; other
  gates remain active.
