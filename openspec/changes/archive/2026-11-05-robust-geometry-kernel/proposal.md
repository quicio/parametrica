## Why

Self-intersection split and surface CSG both depend on reliable orientation and
intersection classification. The current code uses double arithmetic with fixed
epsilon in several places, so near-degenerate inputs can be misclassified. A
shared robust kernel removes that duplication and gives later slices a stable
foundation.

## What Changes

- Add exact sign fallbacks for 2D and 3D orientation.
- Add scale-aware adaptive tolerance derived from bbox and coordinate magnitude.
- Add deterministic snap rounding.
- Add robust 2D segment intersection and point-in-triangle helpers.
- Add a triangle-triangle intersection classifier returning a segment or a
  coplanar classification.
- Integrate robust orientation into self-intersection classification and ear
  clipping.
- Keep the kernel dependency-free, DOM-free and deterministic.

## Capabilities

### New Capabilities

- `robust-geometry-kernel`: exact signs, tolerance, snapping and intersections.

### Modified Capabilities

- `self-intersection`: robust side classification.
- `advanced-repair`: robust ear clipping.
- `solid-booleans`: tolerance helpers available for later surface CSG.

## Impact

- `src/geometry/robustPredicates.js`
- `src/geometry/selfIntersection.js`
- `src/geometry/repair.js`
- Unit tests and docs

## Non-goals

- No surface CSG implementation in this slice.
- No exact BREP kernel.
- No new dependency.
- No change to document format or UI.
