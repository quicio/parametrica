## Why

`view/transform`, `view/projection` and `view/viewportCoordinates` are the
single world→view→artboard→device mapping used by the engine, scene builder,
canvas, coordinates overlay, picking and exporters. They were the last untyped
view modules and the typed callers had to cast around their loose JSDoc.

## What Changes

- Convert `view/transform.js` to `.ts` with typed spaces, frames, bounds,
  projected points and `ViewTransform`.
- Convert `view/projection.js` to `.ts` with typed curves, meshes, projection
  options and framed/scene helpers.
- Convert `view/viewportCoordinates.js` to `.ts` with typed descriptors,
  ranges, ticks, panels and readouts.
- Keep the JS compatibility re-exports and point internal imports at `.ts`.
- Update the scene builder to use the typed view contracts.

## Out of Scope

- P5/WebGL/UI adapters and geometry kernels.
- Changing framing, projection, coordinate, picking or export behavior.
