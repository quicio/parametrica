# CSG robustness

Phase 6D adds strategy-driven CSG for non-convex overlapping solids. The first
implementation keeps BSP for well-conditioned meshes and uses deterministic
remesh as the robust fallback.

## Strategies

`view.fabrication.csgStrategy`:

```text
auto | bsp | remesh
```

- `bsp`: existing tree-based engine; fast for cubes/spheres and disjoint or
  nested bodies.
- `remesh`: signed-distance/parity field plus marching tetrahedra; robust for
  overlapping non-convex bodies.
- `auto` (default): try BSP first; if it returns invalid topology or exceeds its
  budget, fall back to remesh. The result reports `strategy`, `fallback` and the
  remesh resolution.

## Tolerance

- Default `1e-4` world units.
- Used for plane classification, welding, T-junctions and repair.
- `auto` tolerance can be derived from mesh scale in a future refinement; the
  current implementation records the explicit value in stats.

## Validation

Every result passes the standard gate: closed, manifold, oriented, free of
self-intersections and positive volume. Failed results never reach STL/3MF.

## Robustness status

- Cube matrix regression remains on BSP.
- Full-resolution overlapping tori union/difference/intersection validate via
  remesh with `fallback: bsp-invalid`.
- Union/intersection volume consistency is within 2% at resolution 48.
- Remesh output is approximate and may smooth features.

## UI

Fabricate shows the CSG strategy next to the Boolean selector. The Boolean
result row includes the actual strategy and fallback, e.g.:

```text
union · 2 operands · remesh (bsp-invalid)
```

Switching strategy does not change selected bodies, repair or units.

## Limits

- No exact surface-splitting CSG strategy yet.
- Remesh resolution trades speed for fidelity.
- Highly pathological inputs can still return a structured failure.
