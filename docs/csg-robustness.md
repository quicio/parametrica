# CSG robustness

Phase 6D adds strategy-driven CSG for non-convex overlapping solids. The first
implementation keeps BSP for well-conditioned meshes and uses deterministic
remesh as the robust fallback.

## Strategies

`view.fabrication.csgStrategy`:

```text
auto | manifold | bsp | remesh
```

- `manifold`: primary engine via Manifold WASM; guaranteed manifold output for
  valid operands.
- `bsp`: existing tree-based fallback; fast for well-conditioned cubes/spheres.
- `remesh`: signed-distance/parity fallback; robust but approximate.
- `auto` (default): Manifold when ready; BSP then remesh if it fails. The result
  reports `strategy`, `fallback` and the remesh resolution.

## Tolerance

- Default `1e-4` world units.
- Used for plane classification, welding, T-junctions and repair.
- `auto` tolerance can be derived from mesh scale in a future refinement; the
  current implementation records the explicit value in stats.

## Validation

Every result passes the standard gate: closed, manifold, oriented, free of
self-intersections and positive volume. Failed results never reach STL/3MF.

## Robustness status

- Cube matrix can use Manifold or BSP; both produce correct volumes.
- Full-resolution overlapping tori union/difference/intersection run through
  Manifold directly and validate.
- Manifold tori reference: union ~289 ms, difference ~203 ms, intersection
  ~163 ms.
- Remesh remains the fallback when Manifold is unavailable or input is not
  manifold-compatible.
- Remesh output is approximate and may smooth features.

## UI

Fabricate shows the CSG strategy next to the Boolean selector. The Boolean
result row includes the actual strategy and fallback, e.g.:

```text
union · 2 operands · remesh (bsp-invalid)
```

Switching strategy does not change selected bodies, repair or units.

## Limits

- Manifold requires manifold input; self-intersecting meshes need repair first.
- No exact surface-splitting strategy for self-intersections yet.
- Remesh resolution trades speed for fidelity.
- Highly pathological inputs can still return a structured failure.
