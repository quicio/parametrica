## Why

`render/p5/P5Adapter` is the technical canvas backend: it owns the p5 sketch,
camera input, animation transport, scene drawing, capture, thumbnails,
coordinate pins and overlay dispatch. It was the last large untyped render
adapter.

## What Changes

- Convert `render/p5/P5Adapter.js` to `.ts`.
- Add structural p5 canvas, app, artboard, pointer, pin and drag contracts.
- Type mount/size/render/capture/thumbnail/coordinate/scene methods.
- Add a minimal local `p5` module declaration and point composition at `.ts`.
- Keep the JS compatibility re-export and update maintainability checks.

## Out of Scope

- Interaction builders, UI panels and geometry/generators.
- Changing drawing, camera input, capture, pins or animation behavior.
