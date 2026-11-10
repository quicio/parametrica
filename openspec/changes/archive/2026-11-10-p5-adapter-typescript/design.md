## Types

- `P5Like`, `P5CanvasLike`, `P5AppLike`.
- `ArtboardInfo`, `ArtboardRect`, `PointerState`, `DragState`.
- `CoordinatePin`.
- Document/evaluation/scene contracts come from typed core/domain modules.

## Rules

- p5 remains a lazy dependency with a local minimal declaration.
- Scene/overlay boundaries cast once at the adapter edge.
- Camera drag and wheel input only act over the canvas.
- Capture mode, coordinate pins and frame degradation are unchanged.

## Verification

- `tsc --noEmit`, Node, arch and e2e gates pass.
- Canvas drawing, capture, thumbnail, pins and animation are unchanged.
