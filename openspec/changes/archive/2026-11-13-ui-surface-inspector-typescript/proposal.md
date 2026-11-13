## Why

Surface inspection is the read-only hover/pin overlay that reports pick,
mapping and world coordinates without mutating geometry.

## What Changes

- Convert `ui/SurfaceInspector.js` to `.ts`.
- Type pick results, app/render ports, pins, messages and rows.
- Keep the JS compatibility re-export.

## Out of Scope

- UV domain inset, sections and Controls.
