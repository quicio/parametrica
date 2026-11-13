## Why

The worker entry and side-effect indexes are the last untyped module boundaries
outside geometry and UI.

## What Changes

- Convert `workers/fabricationWorker.js` to `.ts` with a typed worker scope.
- Convert `generators/index.js`, `render/passes/index.js`,
  `render/camera3d.js` and `render/P5Renderer.js` to `.ts`.
- Keep JS compatibility re-exports.

## Out of Scope

- UI modules and the lattice kernels.
