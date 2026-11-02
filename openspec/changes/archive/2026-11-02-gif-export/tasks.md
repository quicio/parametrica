## 1. GIF encoder

- [x] 1.1 Add `gifenc` and `src/export/gif.js` with `encodeGIF(frames,
      { fps, loop, maxColors })`, a global palette sampler and a 240-frame cap.
- [x] 1.2 Add `gifFrameTimes(duration, fps)` and validate dimensions, frame
      data and empty input.
  - Verify: unit coverage for header/trailer, dimensions, empty input and the
    frame cap in `test/lab.smoke.mjs`.

## 2. Artboard capture

- [x] 2.1 Add `P5Adapter.artboardImageData(maxSize)` with an aspect-preserving
      scratch canvas, opaque background and cached 2D context.
  - Verify: exporter/e2e capture; no direct DOM dependency in the encoder.

## 3. Exporter

- [x] 3.1 Add `Exporter.exportGIF()` using timeline duration/FPS, progress
      callback, binary download and `finally` restoration of time/playback.
  - Verify: unit tests for `gifFrameTimes`/encoding and the timeline e2e flow.

## 4. Timeline UI

- [x] 4.1 Add an **Export GIF** button beside **Export frames**, using the
      current duration/FPS and disabling during export.
- [x] 4.2 Report progress/errors in the existing timeline status line and add
      the minimal button styling.
  - Verify: e2e downloads `*.gif`, shows the status and preserves the playhead.

## 5. Documentation and acceptance

- [x] 5.1 Update README, SPEC.md, architecture notes and counts.
- [x] 5.2 Run `npm run check`, `npm run test:e2e`, `openspec validate
      --changes --strict`; archive the change after acceptance.

## Acceptance criteria

- A timeline can be exported as one animated `.gif`.
- The GIF uses the timeline duration/FPS contract and a 360 px maximum side.
- The background, layers, styles, projection and render passes match the
  current canvas; the reference underlay is excluded.
- The current time and playing state are restored after export.
- Exports above 240 frames fail with a visible status.
- Existing PNG-sequence, SVG and PNG exports are unchanged.
- No document/timeline schema change and no new initial bundle dependency.


## Verification results

- `npm run check`: lint, **1633/1633** unit checks and production build pass.
- `npm run test:e2e`: **94/94** Playwright tests pass.
- `openspec validate --changes --strict`: pass.
- New e2e flow downloads a `*.gif`, checks the GIF89a header/trailer and
  confirms the playhead is restored.
- Manual export: 1 s at 8 FPS produced 8 frames, 360×360, ~34 KB, read by
  `ffprobe` as a valid GIF.
- Build emits a lazy `gif-*.js` chunk (~9 KB) instead of adding the encoder to
  the initial bundle.
