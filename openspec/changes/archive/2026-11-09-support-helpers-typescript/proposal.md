## Why

The engine, generators, renderer, lab and UI share a set of pure support
helpers: camera projection, spatial references, period math, parametric
sampling, curve analysis, timeline resolution, mutation and diagnostic
overlays. They were the last untyped pieces on those hot paths.

## What Changes

- Convert `view/camera`, `view/cameraController` and `view/spatialReference`
  to `.ts`.
- Convert `math/periods`, `sampling/parametric` and `analysis/intersections`,
  `analysis/differential` to `.ts`.
- Convert `animation/timeline`, `animation/animatable`,
  `mutation/MutationEngine` and `viz/overlays` to `.ts`.
- Keep the JS compatibility re-exports and point internal imports at `.ts`.

## Out of Scope

- The camera transform/projection pipeline, generators, geometry and UI.
- Changing sampling, camera, analysis, timeline or mutation behavior.
