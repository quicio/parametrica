## Why

Remesh is the robust fallback for self-intersections and non-convex CSG. Its
vertices sit on a grid, which smooths features and biases volume. Projecting
generated vertices back to the source surface and snapping near sharp edges
improves fidelity without changing the robust watertight topology.

## What Changes

- Add feature-edge detection by dihedral angle.
- Project remesh vertices to the closest source surface point.
- Snap vertices near detected feature edges.
- Record projection/feature stats.
- Enable projection by default for remesh fallbacks.
- Keep deterministic output and validation.

## Capabilities

### New Capabilities

- `adaptive-remesh`: feature-aware projection and snapping.

### Modified Capabilities

- `csg-robustness`: remesh fallback uses feature-preserving projection.
- `self-intersection-repair`: remesh repair uses feature-preserving projection.

## Impact

- `src/geometry/remesh.js`
- Tests and docs
- No UI/document format change

## Non-goals

- No octree/dual-contouring rewrite.
- No exact feature reconstruction.
- No change to CSG/self-intersection strategy selection.
