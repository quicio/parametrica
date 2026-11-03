## Why

After Phase 0 the scene has a shared `ViewTransform`, but world geometry still
floats without a visible origin or axes. Users cannot tell where world (0,0,0)
is or how the camera/projection orients the shape. A dense 3D grid would add
noise and false occlusion; a minimal reference is enough.

## What Changes

- Add `view.reference = { enabled, ground }`, off by default.
- Add a pure spatial-reference geometry builder for origin, XYZ axes, labels
  and an optional low-density z = 0 ground plane.
- Draw the reference in Canvas and Quad through the scene transform.
- Add Canvas UI toggles for Reference and Ground.
- Keep the reference out of the artboard frame, SVG, plotter, PNG and GIF.
- Keep it separate from CAD Guides.
- Respect scene, composition and world frame policies.

## Capabilities

### New Capabilities

- `spatial-reference`: UI-only world origin, axes and optional ground.

### Modified Capabilities

- None.

## Impact

- New: `src/view/spatialReference.js`, `src/render/reference.js`.
- Modified: document defaults/sanitization, scene meta, p5 adapter, Controls,
  tests and docs.
- Document format adds optional `view.reference`; old documents default to off.
- No geometry, generator or export format change.

## Non-goals

- No UV Domain, UV ↔ XYZ or parametric-domain overlay.
- No CAD grid, snapping, dimensions or physical units.
- No 3D-printing or fabrication features.
- No reference in exports or captures.
- No z-buffer or new occlusion model.
