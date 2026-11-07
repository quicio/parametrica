# Lattice refinement benchmark

**Date:** 2026-11-06
**Source:** `scripts/bench-lattice-refinement.mjs`
**Environment:** Node 22, macOS, Manifold WASM, `finishQuality = standard`.
**Status:** provisional. Machine-specific; not a CI gate.

| Preset | Cell | Build | Triangles | Max chord | Opening min | Export |
|---|---:|---:|---:|---:|---:|---|
| Lattice Vase 200 | 15 mm | 5.5 s | 298,902 | — | 2.41 mm | ready |
| Lattice Vase 200 | 20 mm | 5.2 s | 169,608 | — | 6.26 mm | ready |
| Lattice Vase 200 | 25 mm | 1.6 s | 106,316 | — | 6.26 mm | ready |
| Organic Lattice Vase 200 | 15 mm | 12.6 s | 544,200 | 0.150 mm | 5.84 mm | ready |
| Organic Lattice Vase 200 | 20 mm | 4.9 s | 309,390 | 0.150 mm | 6.84 mm | ready |
| Organic Lattice Vase 200 | 25 mm | 3.1 s | 203,810 | 0.150 mm | 7.99 mm | ready |

## Interpretation

- The organic preset uses adaptive surface curves; the lattice preset stays
  polyline and therefore reports no chord deviation.
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
