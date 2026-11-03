## Why

The inspector reports surface/cell/UV/XYZ text but the canvas gives no immediate
visual answer for where the picked point, triangle and parametric cell are.
Users also cannot freeze a pick while moving the pointer.

## What Changes

- Add a pure inspection-overlay geometry builder.
- Draw a point marker, picked triangle and parametric cell on Canvas single.
- Use an explicit invalid style for mapping missing/mismatch.
- Add Pin/Release to the inspector.
- Revalidate pinned results against current evaluation and release on invalid
  view/topology/layer changes.
- Keep all overlays UI-only and out of render, captures and exports.

## Capabilities

### Modified Capabilities

- `surface-inspection`: visual marker/triangle/cell overlays and pin lifecycle.

## Impact

- New: `src/interaction/inspectionOverlay.js`.
- Modified: `SurfaceInspector`, `surfacePicker` validation, P5 adapter, CSS,
  tests and docs.
- No geometry, tessellation, SurfaceMapping, Projection Source, ViewTransform,
  RenderScene, frame, bbox or export change.

## Non-goals

- No Quad picking/overlays.
- No seam/twist visualization.
- No persistent object selection, editing, UV unwrap or CAD.
- No z-buffer, export or inspection serialization.
