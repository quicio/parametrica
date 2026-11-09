# Product preview benchmark

**Date:** 2026-11-06
**Environment:** Playwright Chromium, software WebGL (SwiftShader), 1440×900 viewport,
`dpr = 1`.
**Source:** `e2e/preview-benchmark.spec.js` with `BENCH_PREVIEW=1`.
**Status:** software baseline plus a hardware run.

## Software WebGL baseline

| Cell size | Mesh triangles | Draw calls | Avg frame | p95 frame | Shadow map | DPR |
|---:|---:|---:|---:|---:|---:|---:|
| 15 mm | 53,132 | 2 | 227.6 ms | 266.7 ms | 2048 | 1 |
| 20 mm | 34,536 | 2 | 189.0 ms | 200.2 ms | 2048 | 1 |
| 25 mm | 25,370 | 2 | 170.3 ms | 200.1 ms | 2048 | 1 |

## Hardware GPU baseline

**Date:** 2026-11-08
**Environment:** Playwright Chromium, `--use-angle=metal --enable-gpu
--disable-gpu-vsync --disable-frame-rate-limit`, Apple M1, 1440×900,
`dpr = 1`, `gl.finish()` after every frame.
**Renderer:** `ANGLE (Apple, ANGLE Metal Renderer: Apple M1)`.
**Source:** `BENCH_PREVIEW=1 BENCH_GPU=1 npx playwright test e2e/preview-benchmark.spec.js`.

| Cell size | Mesh triangles | Draw calls | Avg frame | p95 frame | Shadow map | DPR |
|---:|---:|---:|---:|---:|---:|---:|
| 15 mm | 61,030 | 2 | 0.4 ms | 0.6 ms | 2048 | 1 |
| 20 mm | 38,802 | 2 | 0.4 ms | 0.6 ms | 2048 | 1 |
| 25 mm | 28,084 | 2 | 0.2 ms | 0.4 ms | 2048 | 1 |
| 20 mm + SSAO high | 6,306* | 3 | 0.6 ms | 1.1 ms | 4096 | 1 |

\* The SSAO pass reports the composer's scene triangles separately from the
prepared mesh; the fabrication mesh remains 169,620 triangles for this cell.

The hardware numbers measure submission plus an explicit GPU finish on one
machine. They are not a universal FPS guarantee and must be repeated on target
hardware before becoming a hard gate. The software baseline remains the CI
regression signal.

## Bundle

- Initial `index` chunk: 688.1 kB (gzip not reported by the check).
- Lazy `ProductPreview` chunk: 513.2 kB (525.5 kB before minification).
- `scripts/check-preview-bundle.mjs` asserts that Three.js markers are absent from
  the initial chunk and present in the lazy chunk.

## Interpretation

- These numbers measure the **software WebGL** path in CI, not a discrete or
  integrated GPU. They are a regression baseline, not a 60 fps guarantee.
- The frame budget must be re-measured on target hardware before setting a hard
  gate.
- The optional SSAO path is separate; it is expected to be more expensive and
  should be measured with `ao: true` before becoming a default.
- The preview remains lazy-loaded; opening the app in Technical mode does not
  download the Three.js chunk.

## CI screenshot policy

- CI always runs the pixel-variance test (non-black pixels plus material and
  shadow variance) and the context-loss fallback test.
- CI does not compare a checked-in screenshot baseline: SwiftShader and GPU
  runners differ too much for a stable cross-runner image.
- GPU screenshots are manual artifacts, attached to the benchmark run.
- The lazy-chunk guard remains mandatory.

## Pending

- Repeat the hardware benchmark on a second GPU class.
- Memory and context-loss recovery on long sessions.
