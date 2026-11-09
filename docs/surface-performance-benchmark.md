# Surface interaction benchmark

**Date:** 2026-11-08
**Script:** `scripts/bench-surface-performance.mjs`
**Scene:** Enneper Surface, 160 × 120 samples, 38,962 points, 282 curves.
**Environment:** Playwright Chromium, headless, 1440×900.
**Status:** provisional; machine-specific.

| Operation | Avg | p95 | Max |
|---|---:|---:|---:|
| Evaluate | 2.2 ms | 2.2 ms | 2.2 ms |
| Render frame | 16.9 ms | 16.9 ms | 16.9 ms |
| Pick | 2.5 ms | 4.3 ms | 5.3 ms |
| Seam overlay on/off + render | 19.1 ms | 19.1 ms | 19.1 ms |
| Playback step + render | 44.7 ms | 63.4 ms | 64.7 ms |

## Interpretation

- Picking remains interactive on a dense surface.
- Seam overlay roughly matches a render frame.
- Playback is the bottleneck at this density (~22 fps average).
- The scene is intentionally heavy; these are not default preset numbers.
- No automatic degradation is implemented yet. Playback should reduce optional
  overlays or preview detail before the UI blocks.

## Next

- Add a playback budget and degrade path.
- Repeat in a real browser with the actual animation transport.
- Measure a second dense fixture and Quad layout.
