## Placement

`geometry/wallThickness.ts` owns the estimator; `manufacturingProfile` stays
domain-pure and receives a plain measurement. `application/fabricationSource`
joins them for the report.

## Sampling

Triangulate polygons with a fan, compute area and normals, orient the mesh by
its signed volume, then pick up to 256 area-weighted triangle centroids. When
the mesh has fewer triangles, every triangle is sampled. Sampling is
deterministic: no random seed.

## Rays

Each centroid casts along the inward normal from a small normal offset. A BVH
over triangle bounds keeps the cost near `samples × log(triangles)`. If the
inward ray misses, the opposite direction is tried once; a body with mixed
winding still reports a thickness. Hits at or below the offset are discarded.

## Evidence

Thickness is sampled, so the report labels it `estimated` and states the sample
count, min, p05 and median. It never becomes `measured`. A mesh with no hits is
`unknown`. The check uses p05 as the robust minimum so a single grazing sample
cannot fail a body; the absolute minimum stays visible in the detail, and the
check fails only when p05 is below the profile minimum. Warn/block policy is
unchanged.

## Limits

The estimator measures the material between surfaces along the sampled normal.
It does not detect a thin rib whose normal points away from the nearest wall,
and it is not a slicer. A cap on mesh size keeps pathological inputs from
blocking the worker; those report `unavailable` with a reason.
