## Why

`renderSceneBuilder` is the application layer that converts evaluation, layers
and view state into the domain RenderScene. It is imported by App, the exporter,
both renderers and several tests, and was the largest untyped module on the hot
path.

## What Changes

- Convert `application/renderSceneBuilder.js` to `.ts`.
- Type evaluation, document, view, preview, groups, prepared groups and layer
  results.
- Keep the JS compatibility re-export.
- Narrow unknown fields before use and cast JS adapter signatures at the call
  boundary.

## Out of Scope

- `fabricationSource.js` and `App.js`.
- Changing framing, projection, preview or caching behavior.
