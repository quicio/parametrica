## Why

The Product preview makes the prepared fabrication body readable with material,
lighting and shadows, but there is no way to keep that image. Users can export
STL/3MF and the technical PNG, but not the product view they used to judge the
piece.

This is a bounded export slice, not a new renderer.

## What Changes

- Add an explicit “Export Product PNG” action when Product preview is active.
- Capture the current WebGL canvas through the existing preview backend.
- Write a PNG with a deterministic filename prefix and timestamp.
- Keep STL, 3MF, SVG, plotter and the existing technical PNG unchanged.
- Report a clear error when Product preview is not active.

## Out of Scope

- No changes to geometry, fabrication validity or the manufacturing report.
- No SVG/vector export of the PBR view.
- No turntable/video export.
- No slicer or print guarantee.
- No change to the default renderer.

## Dependencies

- `2026-11-06-fabrication-preview`.
- Existing `Exporter` download helpers.

## Impact

- `src/export/Exporter.js`: product preview capture/export.
- `src/ui/sections/fabricateSections.js`, `src/ui/Controls.js`: action state.
- E2E and docs.

## Open Questions

1. Should the exported image include the UI/masthead or only the WebGL canvas?
   Recommendation: canvas only.
2. Should the filename include the document name? Recommendation: document name
   when safe, otherwise `parametrica-product`.
3. Should a transparent background be an option? Not in this slice.
