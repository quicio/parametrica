# Local SDF joint benchmark

**Date:** 2026-11-08
**Module:** `src/geometry/latticeJointBlend.js`
**Script:** `scripts/bench-joint-blend.mjs` (local) and `scripts/bench-sdf-joints.mjs` (full presets)
**Status:** `blend` is opt-in; `rounded` remains the default.

## Local synthetic junction

Four capsules around one node, smooth-min SDF, meshed with
`Manifold.levelSet`.

| Edge length | Result | Triangles | Build time | Manifold |
|---:|---|---:|---:|---|
| 0.70 mm | ok | 264 | 13 ms | yes |
| 0.50 mm | ok | 484 | 9 ms | yes |
| 0.35 mm | ok | 1,132 | 18 ms | yes |

## Full presets

`rounded` vs `blend` with a budgeted number of SDF nodes. The rest of the joints
use the rounded sphere fallback. Full budget (`500`) processes every eligible
node.

| Preset | Joint path | Build | Triangles | SDF nodes | Rounded fallback | Opening |
|---|---|---:|---:|---:|---:|---:|
| Lattice Vase 200 | rounded | 11.4 s | 170,408 | 0 | 0 | 6.26 mm |
| Lattice Vase 200 | blend:12 | 11.9 s | 169,232 | 12 | 289 | 6.26 mm |
| Lattice Vase 200 | blend:24 | 12.0 s | 167,928 | 24 | 277 | 6.26 mm |
| Lattice Vase 200 | blend:500 | 24.0 s | 170,420 | 301 | 0 | 6.26 mm |
| Organic Lattice Vase 200 | rounded | 5.6 s | 309,390 | 0 | 0 | 6.84 mm |
| Organic Lattice Vase 200 | blend:12 | 7.2 s | 309,180 | 12 | 297 | 6.84 mm |
| Organic Lattice Vase 200 | blend:24 | 7.6 s | 309,032 | 24 | 285 | 6.84 mm |
| Organic Lattice Vase 200 | blend:500 | 23.1 s | 309,394 | 309 | 0 | 6.84 mm |

All rows are exportable, closed/manifold and keep the measured opening.
Numbers are machine-specific and include Manifold WASM execution.


## 15/20/25 mm budgeted comparison

`blend:24` means SDF for the 24 sharpest eligible nodes, rounded fallback for the
rest. All rows are exportable and preserve the measured opening.

| Preset | Cell | Rounded build | Blend build | Rounded tris | Blend tris | Opening |
|---|---:|---:|---:|---:|---:|---:|
| Lattice Vase 200 | 15 mm | 50.9 s | 50.9 s | 277,312 | 277,312 | 2.41 mm |
| Lattice Vase 200 | 20 mm | 2.6 s | 3.1 s | 170,408 | 167,200 | 6.26 mm |
| Lattice Vase 200 | 25 mm | 1.5 s | 2.2 s | 108,916 | 105,090 | 6.26 mm |
| Organic Lattice Vase 200 | 15 mm | 12.0 s | 13.4 s | 544,200 | 543,376 | 5.84 mm |
| Organic Lattice Vase 200 | 20 mm | 5.1 s | 5.7 s | 309,390 | 309,818 | 6.84 mm |
| Organic Lattice Vase 200 | 25 mm | 3.2 s | 3.5 s | 203,810 | 202,494 | 7.99 mm |

The 15 mm Lattice case is already a stress case for the rounded path; SDF does
not make it worse. `blend:24` keeps the build cost close to rounded at 20/25 mm.
## Decision

- `rounded` stays the default; `auto` stays rounded.
- `blend` is an explicit opt-in and uses local SDF for the first `blendBudget`
  nodes (default 24), with rounded fallback for the rest.
- Full-budget blend (`500`) is valid but roughly 2–4× the rounded build time;
  it is not the default.
- The requested style, actual method, blended count, fallback count and budget
  are reported in `LatticeSolidResult.stats` and provenance.
- No silent upgrade: a requested `blend` that fails or exceeds budget reports
  `jointFallback` and falls back to rounded.

## Residual work

- Test blend on 15 mm and 25 mm cells explicitly.
- Validate opening preservation for every budget variant, not only the measured
  minimum.
- Add a hardware/CI timing budget before making blend a default.
