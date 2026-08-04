## Why

Parametrica today renders a helix as a special case: `parametric-3d` with
`(R·cos t, R·sin t, h·t)` and a shared camera. The reference design (the
"HELIX PARAMÉTRICO" educational dashboard) shows the target: a **generalized
helix family** with radial modulation, pitch modulation, and torsion — plus
orthographic projections, a height-gradient wireframe, and six named
variations.

The gap is threefold:

1. **Mathematical**: the current generator cannot express
   `x=(r+a·cos(kt+φ))·cos(t+θ)`, `y=(r+a·cos(kt+φ))·sin(t+θ)`,
   `z=pt+b·sin(mt+ψ)` — no radial modulation, no torsion, no pitch ripple.
2. **Visual**: one 3D view only; no Alzado/Planta/Perfil orthographic
   projections, no height-based color gradient on the wireframe.
3. **Pedagogical**: no named variations to explore the parameter space
   (básica, radio variable, paso variable, ondulada, doble hélice, cónica).

Why now: the 3D pipeline (parametric-3d, camera drag, depth metadata
preservation, e2e pixel QA) landed in the last sessions. The helix family is
the natural first-class consumer of that pipeline and the demo surface for
the educational direction the workbench is heading.

## What Changes

- **New generator `helix`** (generalized): parameters `r, p, turns, a, k,
  phi, theta, b, m, psi, samples, adaptive, closed, fit`. Reduces to the
  current parametric-3d helix when `a=0, b=0, theta=0`.
- **New render pass `gradient-wireframe`**: strokes the helix with a color
  ramp by height (z), defaulting to the reference palette
  (yellow→purple→blue). Existing depth-fade behavior preserved for the
  plain stroke pass.
- **New projection operators/render modes** `ortho-xy`, `ortho-xz`,
  `ortho-yz`: orthographic projections of the 3D geometry. Implemented as
  render-time projections (the document keeps full 3D points; views project).
- **Six built-in presets**: Básica, Radio Variable, Paso Variable, Ondulada,
  Doble Hélice, Cónica.
- **Document schema**: `view.projection` select (`'3d' | 'xy' | 'xz' | 'yz'`)
  and `view.colorRamp` (optional, for gradient mode). Both sanitized with
  defaults; old documents unaffected.

## Capabilities

### New Capabilities

- `helix-generator`: generalized parametric helix with radial/pitch
  modulation and torsion; camera-aware; deterministic.
- `orthographic-projection`: orthogonal views (xy/xz/yz) of 3D curves,
  selectable via view.projection, with consistent fit-to-canvas behavior.
- `helix-variations`: named preset family (6 variations) covering the
  parameter-space extremes; each valid, deterministic, and exported.

### Modified Capabilities

- `parametric-3d`: the existing `parametric-3d` generator stays registered
  (backward compat) but the new `helix` generator becomes the canonical
  helix model. No requirement changes to parametric-3d itself.

## Impact

- `src/generators/helix.js` (new) + registration in `src/generators/index.js`
- `src/render/passes/gradient.js` (new) + registration
- `src/operators/geometry/ortho.js` or render-time projection in passes
- `src/core/document.js` — view schema gains `projection`, `colorRamp`
- `src/presets/builtins.js` — 6 new helix presets
- `src/ui/Controls.js` / widgets — projection selector, gradient toggle
- `test/lab.smoke.mjs` — new test groups (helix math, projections, presets)
- `e2e/helix.spec.js` — new e2e suite (drag, projection switch, pixels)
- `SPEC.md` — §6 generator table, §11 view schema, milestone status

Non-goals (this change):
- No WebGL; wireframe stays p5 2D-canvas projected.
- No animation of the helix beyond the existing `time` modulation.
- No multi-viewport layout (simultaneous 3D + 3 projections on one screen);
  projection switching is single-view first, layout later.
- No UI language switch; panel labels stay English (consistent with the
  rest of Parametrica), preset names bilingual-friendly.
- No true pointed cone for the Cónica variation (needs optional `exprR`
  on the generator — tracked as a future change; Cónica ships as the
  half-wave cosine hourglass instead).
- No custom color-ramp editor; the gradient pass ships with the default
  palette and an optional `view.colorRamp` placeholder.
