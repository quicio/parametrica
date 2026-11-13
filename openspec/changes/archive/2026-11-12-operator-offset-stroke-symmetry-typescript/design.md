## Types

- Shared `Vec2` and `CurveLike` shapes.
- `offsetPoints(points, distance, closed)` accepts a number or a per-point
  callback; `expandStroke(points, left, right, closed)` returns typed points.
- Params are coerced through `Number`/`Boolean` at the boundary.

## Rules

- Miter clamping, bbox-based outward detection and outline construction are
  unchanged.
- Meta tags and operator ids are unchanged.
