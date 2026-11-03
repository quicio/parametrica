## Why

Spatial surfaces are generation-only today. `evaluateSurfaceDocument` bypasses
the operator stack, and world operators such as mirror/rotate/scale only accept
`curve2d`/`curve3d`. A surface can be inspected, but not meaningfully edited or
composed, which also blocks a credible fabrication workflow.

## What Changes

- Allow declared world operators to accept and produce Surface/Mesh geometry.
- Run surface operators before tessellation and downstream projection.
- Start with the minimum useful set: translate, rotate, scale, mirror and
  repeat/array for spatial geometry.
- Preserve stable surface/mesh identity when topology is unchanged.
- Regenerate `SurfaceMapping` when an operator changes grid topology.
- Support multiple surfaces in a layer.
- Keep curve operators and existing curve documents unchanged.

## Capabilities

### Modified Capabilities

- `operator-spaces`: spatial geometry operators.
- `surface-pipeline`: surface operator stage and cache behavior.
- `surface-mapping`: mapping lifecycle after transformations.

## Impact

- Engine surface path and world operator registry.
- Geometry transform helpers for Surface/Mesh.
- Operator UI capability filtering.
- SurfaceMapping invalidation/regeneration.
- Tests: unit geometry/operator fixtures, mapping lifecycle, e2e operator flow.
- No CSG, caps, booleans, solid repair or fabrication UI.

## Non-goals

- No CSG/boolean of surfaces or solids.
- No automatic caps, repair or watertightness.
- No mesh authoring or vertex editing.
- No MAKE/Fabricate workspace.
- No change to 2D curve operator semantics.
