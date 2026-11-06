## Context

Geometry code computes determinants and plane sides in doubles. Fixed epsilon
classification is used in self-intersection, ear clipping, BSP splitting and
remeshing. Near-degenerate inputs need a trusted sign even when the double
determinant cancels.

## Decisions

### D1: Fast path plus exact fallback

`orient2dSign(a,b,c)` and `orient3dSign(a,b,c,d)`:

1. Compute the determinant in doubles.
2. Compute a conservative error bound from the absolute term magnitudes.
3. If `|det| > bound`, return the double sign.
4. Otherwise convert all coordinates to exact scaled integers and recompute the
   determinant with BigInt.
5. Return `-1`, `0` or `1`.

Converting doubles to exact integers:

- Decode IEEE-754 sign, exponent and mantissa.
- Represent each value as `mantissa × 2^exponent`.
- Choose the minimum exponent across the inputs and left-shift every mantissa
  to an integer.
- The determinant scales by a positive power of two, so its sign is unchanged.

This is exact for finite doubles and much simpler than expansion arithmetic.
The BigInt path runs only near cancellation.

### D2: Adaptive tolerance

`adaptiveTolerance(pointsOrBBox, options)`:

```text
eps = max(diagonal × factor, maxAbsCoordinate × EPS × 8)
eps = clamp(eps, floor, ceiling)
```

Defaults: `factor = 1e-7`, `floor = 1e-9`, `ceiling = 1e-3`.

The actual epsilon is returned and must be recorded by callers.

### D3: Snap rounding

`snapRound(value, grid)` and `snapPoint(point, grid)` quantize to the nearest
grid multiple deterministically. Grid must be finite and positive. Snapping is
explicit; callers decide when to use it.

### D4: 2D helpers

- `segmentsIntersect2D(a,b,c,d)` uses exact orientation signs, including
  collinear/on-segment handling.
- `pointInTriangle2D(point, a,b,c)` includes boundary points and uses exact
  signs.

### D5: Triangle-triangle primitive

`triangleTriangleIntersection(a,b,c,d,e,f)` classifies two triangles:

- `null` when they do not intersect.
- `{ kind: 'segment', start, end }` for a non-coplanar intersection.
- `{ kind: 'coplanar' }` when all six plane-side signs are zero.

Plane sides use `orient3dSign`, not fixed epsilon. The segment endpoints are
computed by edge/plane interpolation after the robust classification. Coplanar
polygon extraction is intentionally left to the surface-CSG slice.

### D6: Integration

- Self-intersection side classification uses the exact sign when the double
  distance is inside tolerance.
- Ear clipping uses `orient2dSign`.
- CSG and remesh may consume `adaptiveTolerance` now; full surface predicates
  are a later slice.

The kernel never mutates inputs and has no renderer/DOM dependency.

## Test matrix

- Collinear and exactly non-collinear orient2d cases.
- Near-degenerate orient2d where the double determinant cancels.
- Coplanar and near-coplanar orient3d.
- Exact integer fallback matches BigInt reference for random small coordinates.
- Snap rounding determinism and boundary behavior.
- Segment intersection: crossing, touching, collinear overlap and disjoint.
- Point-in-triangle: inside, outside, edge and vertex.
- Triangle-triangle: disjoint, crossing segment, face-touching and coplanar.
- Existing self-intersection/repair regression remains green.
