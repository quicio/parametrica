## 1. Image processing

- [x] 1.1 Add bounded grayscale/threshold/contour extraction.
- [x] 1.2 Add simplification/resampling/DFT.
- [x] 1.3 Build a Fourier document and preview reconstruction error.
- [x] 1.4 Synthetic tests: circle/square reconstruction error and no-contour case.
  - Verify: unit group 23.

## 2. UI

- [x] 2.1 Upload and underlay controls.
- [x] 2.2 Threshold preview and trace button.
- [x] 2.3 Apply as document with notice.
- [x] 2.4 E2E synthetic PNG upload/trace.
  - Verify: e2e.

## 3. Verification

- [x] 3.1 Full test/build/e2e.
- [x] 3.2 Docs/roadmap.
- [x] 3.3 Validate/archive.

## Verification results

- `npm test`: **915/915 checks** (group 23 added).
- `npm run build`: succeeds; the existing >500 kB chunk warning is unchanged.
- `npm run test:e2e`: **49/49 tests**, including synthetic upload/trace/apply and
  the no-contour error path.
- `openspec validate --changes`: valid.
