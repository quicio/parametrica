## Types

- `P5OverlayContext` with the p5 drawing/text/shape surface.
- `P5OverlayAdapter`, `OverlayApp`, `ImageUnderlayLike`.
- `DrawCoordinatesOptions`, `PanelRect`, `SeamEdge`, `InspectionOverlay`.
- Scene/view/reference types are reused from typed modules.

## Rules

- Overlay helpers only read adapter/app state and never mutate the document.
- Canvas clipping and p5 stack push/pop order are unchanged.
- Coordinate/panel/reference geometry is unchanged.

## Verification

- `tsc --noEmit`, Node, arch and e2e gates pass.
- Quad, coordinates, underlay, seam, inspection and reference output unchanged.
