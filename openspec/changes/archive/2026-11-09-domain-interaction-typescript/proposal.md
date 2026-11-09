## Why

The domain still had two JavaScript modules: ray construction/intersection and
surface picking. They are pure, Node-testable math and belong in the typed
domain.

## What Changes

- Convert `domain/interaction/ray.js` to `.ts`.
- Convert `domain/interaction/surfacePicker.js` to `.ts`.
- Type vectors, rays, bounds, transforms, mappings, meshes and pick results.
- Keep `interaction/ray.js` and `interaction/surfacePicker.js` as compatibility
  re-exports.
- Complete the domain TypeScript layer.

## Out of Scope

- Application/UI/adapter conversion.
- Behavior or picking-policy changes.
