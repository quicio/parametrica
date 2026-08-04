## Context

Parametrica's 3D path is `parametric-3d`: a generator that samples
`x(t), y(t), z(t)` expressions, projects through `view.camera`, and emits
per-point `depth`/`depthAlpha` metadata (preserved through fit/center and
operators — enforced by tests). The renderer strokes with optional depth
fade. The camera lives on the document (`view.camera`) so it persists with
presets; canvas drag rotates it (gated on canvas DOM target).

The Helix Lab adds a *first-class helix family* on top of this pipeline.
The reference design also shows orthographic projections and a
height-gradient wireframe — both are rendering concerns, not geometry
concerns, so they belong in render passes and view state, not in the
generator.

## Goals / Non-Goals

**Goals:**
- Generalized helix equations with radial/pitch modulation + torsion.
- Orthographic projections (xy/xz/yz) selectable via `view.projection`.
- Height-gradient wireframe render pass.
- Six named variations as presets.
- All of it covered by unit (Node core) and e2e (Playwright) tests.

**Non-Goals:**
- WebGL / true 3D rendering. Wireframe stays p5 2D-canvas projected.
- Simultaneous multi-viewport layout (3D + 3 projections at once). Single
  view + selector first; the layout is a later change.
- UI language switch. Panel labels stay English.
- Animation beyond existing `time` modulation.

## Decisions

### D1: New `helix` generator, keep `parametric-3d`

`parametric-3d` stays registered (backward compat — presets reference it).
`helix` is a new generator whose `sample()` composes the equations directly
(the modulation terms are structural, not arbitrary expressions — sliders,
not expression fields). Rationale: the helix family has a fixed
mathematical shape with 11 numeric params; expression fields would be
overkill and break the slider-driven educational UX.

Alternative considered: extending `parametric-3d` with 8 more params.
Rejected: it would bloat the generic generator and its schema with
helix-specific fields.

### D2: Projections are render-time, not geometry

`view.projection` selects how points map to screen at draw time:
`'3d'` (camera) or `'xy' | 'xz' | 'yz'` (drop one axis). The engine never
re-evaluates on view switch; the render pass applies the projection to
`curve.points`. Rationale: switching views is a view concern; re-sampling
would be wasted work and would break the camera-drag cache contract.

### D3: Gradient wireframe is a render pass

`gradient-wireframe` reads each point's screen `y` (height) and maps it
through a color ramp (default yellow→purple→blue, matching the reference).
It composes with the projection: in `xz`/`yz` the height IS the vertical
axis, so the gradient tracks the true 3D height stored on the point
(`z` from `curve.meta` or a per-point `h3` field).

Per-point metadata already survives the pipeline, so the pass can read
`pt.depth`/`pt.h3`. Decision: store `h3` (true 3D height) alongside
`depth`/`depthAlpha` in the generator — it is the quantity the gradient
ramps on, and it survives fit/center unchanged.

### D4: Double helix = two curves from one generator

`Doble Hélice` is one document whose generator emits **two curves** (phase
`phi` and `phi + π`). The generator returns `Curve[]` (registry contract
already supports multi-curve). Básica/Radio/Paso/Ondulada/Cónica emit one
curve each; Doble emits two.

### D5: Fit applies to projected bbox

In projection mode, `fit` scales the projected 2D bbox (same `fitCurves`
semantics, applied at render time on the projected points). The 3D view
keeps its current camera-fit behavior.

### D6: Camera drag gated by projection

The canvas drag handler checks `view.projection`; if `≠ '3d'`, drag is a
no-op (yaw/pitch untouched). Same for scroll-wheel zoom (fov).

## Risks / Trade-offs

- **`h3` metadata growth**: one more per-point field. Cheap (number), and
  consistent with the existing metadata-preservation contract. Tests must
  assert it survives fit/center + operators (extend the existing depth
  test).
- **Gradient color fidelity**: p5 stroke per-segment with color lerp is
  fine at ≤ 8000 points but segment-by-segment stroking is slower than
  beginShape. Mitigation: batch segments by ramp bucket (≤ 64 buckets)
  or accept ≤ 8k-point cost (helix defaults are 1000–2400 points).
- **Projection fit vs 3D fit divergence**: a helix's xy-projection bbox
  differs from its 3D bbox; fit size will produce different apparent
  scales per view. Acceptable (each view fits itself); documented in
  SPEC.md.
- **Double-helix fit**: two curves share one fit; the combined bbox is
  used. Standard multi-curve behavior, already handled by `fitCurves`.
