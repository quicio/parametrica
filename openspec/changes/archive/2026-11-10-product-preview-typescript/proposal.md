## Why

`render/webgl/ProductPreview` is the optional presentation renderer for the
prepared fabrication body. It consumes typed RenderScene spatial data and was
the last untyped render adapter besides `P5Adapter`.

## What Changes

- Convert `render/webgl/ProductPreview.js` to `.ts`.
- Add typed mesh, bounds, material, quality, scene, drag and app contracts.
- Type mount/update/material/camera/lighting/benchmark/pointer/context methods.
- Add `@types/three` as a development dependency.
- Keep the JS compatibility re-export and point composition at `.ts`.

## Out of Scope

- `P5Adapter`, interaction builders and UI.
- Changing materials, lighting, camera framing, benchmark or capture behavior.
