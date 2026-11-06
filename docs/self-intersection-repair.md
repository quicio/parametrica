# Self-intersection repair

Phase 6C resolves self-intersecting fabrication meshes with an explicit
deterministic remesh step. Exact local triangle splitting remains future work.

## Strategy

`view.fabrication.selfIntersections`:

```text
none | auto | remesh
```

- `none`: detect and report pairs, do not change geometry.
- `remesh`: sample a signed-distance/parity field and extract an iso-surface.
- `auto`: remesh when pairs exist; the report names the actual strategy.

The resolution is configurable (`remeshResolution`, default 64, capped at 192).

## Remesh

1. Compute the mesh bounding box and a padded regular grid.
2. Evaluate inside/outside by ray parity with a deterministic BVH.
3. Extract a watertight iso-surface with marching tetrahedra.
4. Weld, orient, split topology and validate the result.

The output is watertight and validated, but it is an approximation. Sharp
features and small details may be smoothed.

## Report

The repair report includes:

- detected pair count
- actual strategy
- remesh resolution
- volume delta and triangle delta
- remaining validation errors

If the grid budget is exceeded or remesh fails, export stays disabled with a
structured reason.

## Fabricate

Self-intersection repair is available under Repair and runs after cleanup and
topology repair. The derived mesh replaces only the fabrication source. Render
geometry, layers, SurfaceMapping and exports other than STL/3MF are unchanged.

## Limits

- No exact topology-preserving split.
- Remesh changes tessellation and small features.
- Self-intersection repair does not repair non-manifold topology by itself;
  topology repair remains a separate option.
