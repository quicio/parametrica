## Why

Inspection and seam overlays derive disposable artboard geometry from the
evaluation and render scene. They are read-only UI surfaces.

## What Changes

- Convert `interaction/inspectionOverlay.js` to `.ts`.
- Convert `interaction/seamOverlay.js` to `.ts`.
- Type layers, mappings, transforms, UV edges and overlay results.
- Keep JS compatibility re-exports and adjust overlay call casts.

## Out of Scope

- UI widgets and panels.
