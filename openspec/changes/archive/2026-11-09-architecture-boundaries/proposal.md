## Why

ADR-0004 records the target dependency rule, but `core/document.js` still reaches
render pass style, overlay ids, fabrication repair constants and manufacturing
profiles. Generators also reach the render camera adapter. These are the first
outward edges to remove before TypeScript can protect the seams.

## What Changes

- Add `src/domain/` modules for units, overlay ids, pass style, cap strategies
  and manufacturing profiles.
- Make `core/document.js` depend on those domain modules, not render/viz/geometry.
- Keep compatibility re-exports at the old paths.
- Make generators import the pure view camera, not `render/camera3d`.
- Add a Node boundary test that rejects the removed imports.

## Out of Scope

- Moving `App.js` or splitting the composition root (Phase B).
- Converting modules to TypeScript (Phase C).
- Changing document, geometry, export or UI behavior.
