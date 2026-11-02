## 1. Multi-contour trace

- [x] 1.1 Add `labelComponents()` and `traceImageContours()` with area filtering
      and a 12-contour cap.
- [x] 1.2 Reuse the existing boundary/RDP/resample/Fourier pipeline for each
      component.
- [x] 1.3 Add `buildFourierDocuments()` with one Fourier layer per contour.
  - Verify: unit tests for two-circle detection, Fourier terms, layer count and
    evaluation.

## 2. Image UI

- [x] 2.1 Add the All contours toggle; keep largest as default.
- [x] 2.2 Render all contours in the preview, report count/RMS and apply as
      multiple layers.
  - Verify: e2e uploads two circles, traces two contours and applies two
    Fourier layers without image data in the document.

## 3. Documentation and acceptance

- [x] 3.1 Update README, SPEC, architecture, audit and roadmap.
- [x] 3.2 Run `npm run check`, `npm run test:e2e`, strict OpenSpec validation
      and archive.

## Acceptance criteria

- Default tracing remains largest-contour only.
- All-contours tracing finds separate connected silhouettes.
- Each contour produces editable Fourier harmonics.
- Applying creates one Fourier layer per contour.
- No image data enters the document.
- Counts are bounded and noisy tiny components are ignored.
- Hole-aware/nested contour behavior remains explicitly out of scope.


## Verification results

- `npm run check`: lint, **1669/1669** unit checks and production build pass.
- `npm run test:e2e`: **102/102** Playwright tests pass.
- `openspec validate --changes --strict`: pass.
- Unit tests verify two-component detection, Fourier terms, multi-layer
  document creation, evaluation and bounded selection.
- E2E verifies All contours, preview, two Fourier layers and no image data in
  the serialized document.
- Largest-contour tracing remains the default.
