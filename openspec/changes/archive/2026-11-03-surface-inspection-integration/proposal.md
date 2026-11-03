## Why

The integrated review found that Spatial Reference could become effectively
invisible in perspective because `referenceExtent` divided projected artboard
bounds by artboard scale and treated the result as world units. The rest of the
3A–3E inspection stack coexisted correctly, but this P1 bug broke the visual
integration with surfaces.

## What Changes

- Compute reference extent from world bounds, capped by horizontal world span.
- Never use projected artboard units to size world axes/ground.
- Add integrated overlay coexistence and export-isolation tests.
- Document the 3F integration review and remaining performance limits.

## Capabilities

### Modified Capabilities

- `spatial-reference`: world-space extent independent of projected scale.

## Impact

- Modified: `src/view/spatialReference.js`, tests and docs.
- No geometry, SurfaceMapping, Projection Source, ViewTransform, RenderScene,
  frame, bbox or exporter change.
- No new feature and no new geometric contract.

## Non-goals

- No Quad picking, editing, UV unwrap, CAD or fabrication.
- No BVH or new overlay caching architecture.
