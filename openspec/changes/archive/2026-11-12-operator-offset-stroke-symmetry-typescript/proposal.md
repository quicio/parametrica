## Why

Offset, stroke and symmetry operators share polyline math and conversions
between strokes and closed outlines; they are the widest remaining 2D family.

## What Changes

- Convert `operators/geometry/offset.js` to `.ts`.
- Convert `operators/geometry/symmetry.js` to `.ts`.
- Convert `operators/geometry/stroke.js` to `.ts` and import typed offsets.
- Keep the JS compatibility exports.

## Out of Scope

- Deform, project, clip, boolean, topology and 3D operators.
