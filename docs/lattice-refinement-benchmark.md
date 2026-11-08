# Lattice refinement benchmark

**Date:** 2026-11-06
**Source:** `scripts/bench-lattice-refinement.mjs`
**Environment:** Node 22, macOS, Manifold WASM, `finishQuality = standard`.
**Status:** provisional. Machine-specific; not a CI gate.

| Preset | Cell | Build | Triangles | CV | Opening min | STL / 3MF |
|---|---:|---:|---:|---:|---:|---|
| Lattice Vase 200 | 15 mm | 6.0 s | 298,902 | 0.284 | 2.41 mm | 298,902 / 298,902 |
| Lattice Vase 200 | 20 mm | 6.5 s | 169,608 | 0.222 | 6.26 mm | 169,608 / 169,608 |
| Lattice Vase 200 | 25 mm | 1.7 s | 106,316 | 0.233 | 6.26 mm | 106,316 / 106,316 |
| Organic Lattice Vase 200 | 15 mm | 13.1 s | 544,200 | 0.246 | 5.84 mm | 544,200 / 544,200 |
| Organic Lattice Vase 200 | 20 mm | 6.6 s | 309,390 | 0.203 | 6.84 mm | 309,390 / 309,390 |
| Organic Lattice Vase 200 | 25 mm | 3.2 s | 203,810 | 0.189 | 7.99 mm | 203,810 / 203,810 |

## Interpretation

- The organic preset uses adaptive surface curves; the lattice preset stays
  polyline and therefore reports no chord deviation.
- The 15 mm Lattice CV is 0.284, above the provisional 0.25 target. This is a
  measured limitation, not a hidden pass. The 15 mm organic case is 0.246.
- STL and 3MF triangle counts match the validated mesh in every case.
- `standard` tolerance is `0.15 mm`; the measured maximum is at or below it.
- The 15 mm organic case is the densest and most expensive. It is still
  exportable, but its minimum opening is below the preset target of 6 mm, so the
  manufacturing report warns (warn mode does not block).
- The Lattice 15 mm case uses the technical joint fallback path when needed;
  the final result is still reported as the actual method.
- These numbers are a regression baseline, not a hardware/CI performance
  guarantee.

## Pending

- Golden visual artifacts for both presets.
- Hardware/CI timing budget.
- Local SDF joint benchmark versus `rounded`.
