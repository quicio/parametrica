## Why

The legacy glyph pipeline still backs the classic parametric presets. Typing
its bridge and spline classes completes the non-repair geometry surface.

## What Changes

- Convert `geometry/legacy.js` to `.ts`.
- Convert `geometry/legacy/CatmullRom.js`, `MasterSpline.js`, `Mirror.js` and
  `OpticalCorrection.js` to `.ts`.
- Type legacy points, Bézier segments, glyph params and semantic roles.
- Keep JS compatibility re-exports.

## Out of Scope

- Solid prep, topology repair, CSG, remesh, lattices and UI.
