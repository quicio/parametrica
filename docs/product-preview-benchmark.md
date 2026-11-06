# Product preview benchmark

**Date:** 2026-11-06
**Environment:** Playwright Chromium, software WebGL (SwiftShader), 1440×900 viewport,
`dpr = 1`.
**Source:** `e2e/preview-benchmark.spec.js` with `BENCH_PREVIEW=1`.
**Status:** provisional. Software WebGL is not a hardware GPU baseline.

| Cell size | Mesh triangles | Draw calls | Avg frame | p95 frame | Shadow map | DPR |
|---:|---:|---:|---:|---:|---:|---:|
| 15 mm | 53,132 | 2 | 227.6 ms | 266.7 ms | 2048 | 1 |
| 20 mm | 34,536 | 2 | 189.0 ms | 200.2 ms | 2048 | 1 |
| 25 mm | 25,370 | 2 | 170.3 ms | 200.1 ms | 2048 | 1 |

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

## Pending

- Hardware GPU benchmark at 15/20/25 mm.
- SSAO cost at `high` preview detail.
- Memory and context-loss recovery on long sessions.
- CI screenshot comparison with a tolerance, or an explicit manual-artifact
  policy if SwiftShader is too unstable.
