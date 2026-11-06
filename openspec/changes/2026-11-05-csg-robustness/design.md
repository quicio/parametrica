## Context

`booleanSolids` uses BSP trees. For non-convex meshes, BSP construction splits
many polygons and produces T-junctions; tolerance `1e-4` helps but overlapping
full-resolution tori can still return `invalid-result`. Validation is strict:
closed, manifold, oriented, self-intersection-free, positive volume.

## Decisions

### D1: API

```js
booleanSolids(operation, operands, {
  strategy: 'auto' | 'bsp' | 'surface' | 'remesh',
  tolerance: 'auto' | number,
  maxInputTriangles = 50_000,
  maxDepth = 4096,
  maxPolygons = 250_000,
  remeshResolution = 96,
})
```

Return adds:

```js
{
  strategy, requestedStrategy, fallback, splits, timingMs, volumeDelta
}
```

### D2: Adaptive tolerance

- If `tolerance = 'auto'`, derive `eps` from the combined bbox diagonal and
  coordinate magnitude:
  `eps = clamp(diagonal * 1e-7, 1e-7, 1e-3)`.
- Use the same eps for plane classification, welding, T-junction detection and
  orientation.
- Normalize coordinates about the bbox center before predicate evaluation when
  magnitude is large, to reduce catastrophic cancellation.
- Record the actual eps in stats.

### D3: Surface strategy

For each triangle pair that intersects:

1. Compute the intersection segment/surface curve.
2. Split both triangles along the segment.
3. Classify fragments with a robust generalized winding number or parity test.
4. Keep the fragments selected by the operation.
5. Stitch, weld, resolve T-junctions, orient and validate.

Coplanar overlapping triangles are handled by projecting to the shared plane and
using polygon clipping before classification.

This strategy targets non-convex operands without building a global BSP tree.

### D4: Remesh fallback

If surface splitting exceeds budgets or leaves invalid topology:

1. Build a deterministic signed-distance grid at `remeshResolution`.
2. Extract an iso-surface.
3. Weld, orient and validate.
4. Report `fallback: 'remesh'`, resolution and volume delta.

The result is approximate; exact feature preservation is not promised.

### D5: Auto strategy

- Convex/well-conditioned operands: `bsp`.
- Non-convex or high-split BSP: `surface`.
- Surface failure/complexity: `remesh`.
- If remesh fails: structured failure.
- The actual strategy and fallback are always reported.

Convexity can be estimated with a hull/volume or normal-cone test; the spec
requires a deterministic estimator, not a specific implementation.

### D6: Validation and repair integration

- Every result re-runs `validateMesh` (including self-intersection).
- Run T-junction resolution and orientation repair before validation.
- Do not silently cap or fill holes unless the selected repair options say so.
- Failed results return no geometry.

### D7: Fabricate

Add `view.fabrication.csgStrategy` (`auto` default). The Boolean controls show
strategy and fallback in the report. Changing strategy does not change selected
bodies, repair or units.

## Test matrix

### Regression

- Cube matrix from 5D: overlap, shared face, disjoint, containment,
  self-subtraction, empty intersection.
- Sphere self-union/self-intersection/difference, sphere+cube.
- Determinism and STL bytes.

### Robustness

- Overlapping full-resolution tori: union, difference, intersection all valid.
- Two overlapping spheres at multiple offsets.
- Torus+cube overlapping and nested.
- Highly non-convex preset pairs (Enneper, Helicoid) where operands are valid.
- Volume compared to a Monte Carlo estimate within 2%.
- Repeated runs deterministic.
- Strategy fallback reported.
- Performance: cube/sphere under 2s, tori under 10s on reference hardware.
- Invalid results never export.

### E2E

- Two overlapping torus instances: union and difference succeed.
- Strategy selector and fallback report.
- Render geometry unchanged.
