## Types

- `AppDocument`, `AppLayer`, `AppView`, `AppAnimation`, `EvaluationLike`.
- `AppServices`, `AppAdapters`, `PresetService`, `NotebookLike`,
  `LookStoreLike`, `MutatorLike`.
- `RendererLike`, `ControlsLike`, overlay, inspector, seam and start-with
  contracts.
- `FabricationPreviewLike`, `ProductPreviewLike`, image underlay/input.

## Rules

- The application layer keeps receiving adapters; no concrete UI/render import.
- Adapter factories take `unknown` hosts and return structural contracts.
- Unknown payloads are narrowed at the boundary, never annotated `any`.
- Optional chaining is preserved where the constructor evaluates before
  overlays/controls exist.

## Verification

- `tsc --noEmit`, Node, arch and e2e gates pass.
- Session restore, presets, history, layers, fabrication preview and look
  presets behave unchanged.
