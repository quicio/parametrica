## Why

The domain is fully typed. The application layer still had small untyped
modules at the worker boundary and the animation transport.

## What Changes

- Convert `animationController.js` to `.ts`.
- Convert `fabricationJobRunner.js` to `.ts`.
- Convert `fabricationJobs.js` to `.ts`.
- Type worker messages, progress, reports and runner callbacks.
- Keep JS compatibility re-exports for existing imports.

## Out of Scope

- `App.js`, `renderSceneBuilder.js` and `fabricationSource.js`.
- Changing job timing, worker behavior or report values.
