## 1. Export

- [x] 1.1 Add `exportProductPreviewPNG` to the exporter.
- [x] 1.2 Capture only the WebGL canvas.
- [x] 1.3 Use a deterministic filename and PNG data URL.
- [x] 1.4 Notify and return null when Product preview is inactive.
- [x] 1.5 Keep the technical PNG and STL/3MF/SVG/plotter paths unchanged.

## 2. UI

- [x] 2.1 Add the action to Fabricate.
- [x] 2.2 Show/enable it only for an active Product preview.
- [x] 2.3 Keep the action hidden in Technical preview.

## 3. Verification

- [x] 3.1 Unit test the null/inactive path.
- [x] 3.2 E2E download of a non-empty PNG.
- [x] 3.3 Confirm geometry, report and other exports do not change.
- [x] 3.4 Document the presentation-only limit.
- [x] 3.5 Run full gates.

## Acceptance criteria

- Product preview exports a valid PNG.
- Technical PNG and STL/3MF/SVG/plotter are unchanged.
- The action is unavailable outside Product preview.
- No geometry or fabrication state changes.
