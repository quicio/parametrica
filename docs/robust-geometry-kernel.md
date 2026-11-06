# Robust geometry kernel

The shared kernel provides exact orientation signs, scale-aware tolerance,
snap rounding and intersection primitives for repair, self-intersection and
future surface CSG.

## API

```js
orient2dSign(a, b, c)
orient3dSign(a, b, c, d)
exactOrient2dSign(a, b, c)
exactOrient3dSign(a, b, c, d)
adaptiveTolerance(pointsOrBBox, options)
snapRound(value, grid)
snapPoint(point, grid)
segmentsIntersect2D(a, b, c, d)
pointInTriangle2D(point, a, b, c)
triangleTriangleIntersection(a, b, c, d, e, f)
```

## Exact signs

Fast determinant path:

1. Compute the determinant in doubles.
2. Derive a conservative error bound from term magnitudes.
3. Use the double sign when safely away from zero.

Near cancellation:

1. Decode each finite double as `mantissa × 2^exponent`.
2. Choose the minimum exponent and left-shift every mantissa to an exact
   integer.
3. Recompute the determinant with BigInt.
4. Return `-1`, `0` or `1`.

The determinant scales by a positive power of two, so the sign is preserved.
This is exact for finite doubles and avoids expansion-arithmetic complexity.
The BigInt path runs only near cancellation.

Non-finite inputs return `0` (indeterminate) instead of throwing.

## Adaptive tolerance

```js
const { epsilon, diagonal, maxAbs } = adaptiveTolerance(pointsOrBBox, {
  factor: 1e-7,
  floor: 1e-9,
  ceiling: 1e-3,
});
```

Epsilon is `max(diagonal × factor, maxAbs × EPS × 8)`, clamped to the bounds.
Callers must record the actual epsilon.

## Snap rounding

`snapRound` and `snapPoint` quantize to an explicit positive grid. Invalid grids
leave values unchanged. Snapping is never implicit.

## 2D primitives

- `segmentsIntersect2D` handles crossing, touching, collinear overlap and
  disjoint segments using exact orientation signs.
- `pointInTriangle2D` includes boundary points.

## Triangle classifier

`triangleTriangleIntersection` returns:

```js
null
{ kind: 'segment', start, end }
{ kind: 'point', point }
{ kind: 'coplanar' }
```

Plane sides use `orient3dSign`, not fixed epsilon. Non-coplanar segment endpoints
come from robust plane-side classification plus edge interpolation. Coplanar
overlap is classified as `coplanar`; polygon extraction is left to surface CSG.

## Integration

- Self-intersection uses the exact side fallback when a double distance is
  within tolerance.
- Ear clipping uses `orient2dSign` and robust point-in-triangle.
- CSG accepts `tolerance: 'auto'` and records `toleranceSource`.
- Existing repair/CSG behavior remains unchanged for explicit tolerances.

## Limits

- Exact fallback covers orientation signs; it is not a full exact arithmetic
  library for all predicates.
- Coplanar triangle overlap returns a classification, not the overlap polygon.
- The kernel does not implement surface CSG or self-intersection splitting.
