# Parametrica — v0.1 Specification

**A parametric geometry workbench**

Status: Draft for v0.1.0
Supersedes: Glyph Lab v2.0.0 (parametrized bilateral-spline engine)

> A form is not drawn. A form is parameterized.

---

## 1. Vision

Parametrica evolves Glyph Lab into a **parametric geometry workbench**.

A form is not designed. A form is **parameterized**.

The user does not tweak control points. The user explores mathematical
spaces — equations, harmonics, parameter domains — and continuous monoline
forms emerge. The application must feel closer to Desmos, GeoGebra,
Processing, Mathematica or Shadertoy than to Illustrator.

---

## 2. Design Principles (inviolable)

| # | Principle |
|---|-----------|
| G1 | Every visual element originates from mathematics. No pen tool, no anchor editing, no manual drawing — ever. |
| G2 | A form is a **serializable pipeline**: generator + ordered operator stack + parameters. The JSON document *is* the form. |
| G3 | Every pipeline stage is **replaceable** via registries. New generators/operators plug in without modifying the engine. |
| G4 | Mutation occurs in **parameter space only**. Never pixels, never paths. |
| G5 | Real-time: geometry pipeline ≤ 16 ms for ≤ 20 000 samples on reference hardware. Differential analysis is lazy and opt-in. |
| G6 | Determinism: same document + same seed + same time ⇒ identical geometry. All noise is seeded. |
| G7 | Optical balance over numerical symmetry (carried from v1). |

---

## 3. Tech Stack

Carried from v1: **Vite · ES Modules · p5.js · lil-gui · SVG export ·
object-oriented, DOM-free core**.

Current dependencies:

| Dependency | Status | Purpose |
|---|---|---|
| `polygon-clipping` | ✅ shipped | Boolean union/difference/intersection (M4 partial) |
| `d3-delaunay` | ✅ shipped | Voronoi topology operator (M4 partial) |
| `@codemirror/*` | ⏳ planned | Formula editor with syntax highlighting (M3 polish) |

No UI framework. No WebGL (until a profiled need proves otherwise).

---

## 4. Pipeline Architecture

```
Function            ← expression engine (math/)
      ↓
Parameter Space     ← animatable parameters, schema-driven
      ↓
Curve Generator     ← pluggable generator registry
      ↓
Curve Sampling      ← adaptive + arc-length uniform
      ↓
Geometry Operators  ← Curve[] → Curve[]
      ↓
Topology Operators  ← Curve[] → Curve[] (structure-changing)
      ↓
Optical Corrections ← final aesthetic adjustments
      ↓
Glyph Renderer      ← p5, composable render passes
      ↓
SVG / PNG / JSON
```

### 4.1 Core data types

```js
/** Point */        { x: number, y: number }

/** Curve */        {
  id: string,
  points: Point[],          // sampled polyline, arc-length table attached
  closed: boolean,
  meta: { source: string }, // provenance: which generator/operator made it
}

/** ParametricaDocument — the serializable soul of a form */ {
  version: 3,
  app: 'parametrica',
  name: string,
  seed: number,
  activeLayer: number,
  layers: Array<{
    id, name, visible, locked, seed,
    generator: { id, params, mods },
    operators: Array<{ id, params, enabled }>,
    style: { stroke, fill, blend },
  }>,
  view:      { modes, overlays, artboard, camera, guides },
  animation: { playing: boolean, speed: number, time: number },
}

/** AnimatableValue */  number | { expr: string }   // see §11 Animation
```

### 4.2 Registry contracts

```js
Generators.register({
  id: 'superformula',
  name: 'Superformula',
  params: PARAM_SCHEMA,            // same schema format as v1 core/params.js
  domain: (params) => ({ t0, t1, closed }),   // parameter domain
  sample: (params, ctx) => Curve[],           // pure function
});

Operators.register({
  id: 'radial-repeat',
  name: 'Radial Repeat',
  params: PARAM_SCHEMA,
  apply: (curves, params, ctx) => Curve[],    // pure function
});

RenderPasses.register({
  id: 'curvature-heatmap',
  name: 'Curvature Heatmap',
  draw: (p5, data, ctx) => void,
});
```

`ctx = { time, seed, rng(), quality }` — injected everywhere; no hidden
globals. All `sample`/`apply` functions are **pure** and **Node-runnable**.

### 4.3 Engine

`evaluate(document, ctx) → { curves, analysis, stats }`

- Evaluates generator → operator stack → optical corrections, in order.
- Memoizes per stage (hash of stage params); slider drags re-evaluate only
  downstream stages.
- `stats`: per-stage milliseconds, point counts — surfaced in telemetry.
- Validation: finite samples, non-degenerate bbox, point budget
  (≤ 50 k/curve, ≤ 200 k total). Invalid results are rejected with the
  stage flagged, never rendered half-broken.

### 4.4 Document app identifier & legacy read

Serialized documents carry `app: 'parametrica'`. The sanitizer accepts
both `'parametrica'` (current) and the legacy `'glyph-lab'` on read, so
presets saved before the rename keep loading. Writes always emit
`'parametrica'`. v1 presets (no `generator` field, just `params`) continue
to migrate to the `bilateral-spline` generator through the same path.

---

## 5. Expression Engine (`math/`)

Safe evaluation — **no `eval`, no `new Function`**.

`tokenize → Pratt parser → AST → compiled evaluator`

- **Variables:** `t`, `theta`, `time`, plus generator-defined.
- **Constants:** `pi`, `tau`, `e`, `phi`.
- **Operators:** `+ − * / ^ %`, unary minus, comparison-free.
- **Functions:** `sin cos tan asin acos atan atan2 sinh cosh tanh abs sign
  floor ceil round fract sqrt cbrt exp log log2 pow min max clamp lerp
  smoothstep step mod hypot` and seeded `noise(x)`, `noise(x, y)`.
- **Errors** carry `{ message, start, end }` spans for inline display.
- Compiled expressions are cached by source string.

---

## 6. Curve Generators (`generators/`)

One file per generator, self-registered. Changing the generator changes
the entire mathematical model — parameter panel is rebuilt from schema.

| id | Model | Key parameters | Domain |
|---|---|---|---|
| `bezier` | Procedural cubic Bézier chains (control polygon derived from params, never hand-edited) | segments, spread, curl, symmetry | t ∈ [0,1] |
|| `catmull-rom` | Catmull-Rom (v1 spline, generalized) | points, tension, alpha | t ∈ [0,1] |
|| `cubic-spline` | Natural cubic through procedural nodes | nodes, distribution | t ∈ [0,1] |
|| `lissajous` | x=sin(a·t+δ), y=sin(b·t) | a, b, delta, phase2, amp | t ∈ [0,2π] |
|| `rose` | r=cos(k·θ), k=n/d | n, d, radius, phase | θ ∈ [0, 2π·d] |
|| `superformula` | Gielis: r(θ) = (‖cos(mθ/4)/a‖^n2 + ‖sin(mθ/4)/b‖^n3)^(−1/n1) | m, n1, n2, n3, a, b, radius | θ ∈ [0,2π] |
|| `polar` | **r(θ) = expression** | expression, turns, domain | user |
|| `parametric` | **x(t), y(t) = expressions** | exprX, exprY, domain, closed | user |
|| `fourier` | x(t)=Σ, y(t)=Σ harmonic tables | see §7 | t ∈ [0,2π] |
|| `hypotrochoid` | Spirograph inside | R, r, d, turns | t ∈ [0, 2π·k] |
|| `epitrochoid` | Spirograph outside | R, r, d, turns | t ∈ [0, 2π·k] |
|| `harmonic-oscillator` | Damped/coupled oscillators x=Σ Aᵢe^(−λᵢt)·sin(ωᵢt+φᵢ) | terms[], damping, coupling | t ∈ [0,T] |
|| `noise-field` | Integral curve through seeded simplex flow field | seed, scale, steps, stepSize | parametric |
|| `custom` | Free multi-line equations with intermediate variables (`a = …; x = …`) | source, domain | user |
|| `bilateral-spline` | **v1 legacy**: MasterSpline + Mirror + OpticalCorrection (preserved as generator for v1 preset migration) | v1 schema | t ∈ [0,1] |
|| `helix` | Generalized circular helix with radial/pitch modulation and torsion | r, p, turns, a, k, φ, θ, b, m, ψ, strands | t ∈ [θ0, θ0+2π·turns] |
|| `parametric-3d` | Projected x/y/z expression curve | exprX/Y/Z, t0, t1, samples | user |

> **Implementation status (2026-10-24):** 23 generators registered and
> covered by the test suite (`lab.smoke.mjs` group 4), including the
> attractor family, concentric ellipses, the projected 3D generator and
> the generalized helix family.

---

## 7. Fourier Laboratory

A dedicated module, not just a generator.

- Interactive harmonic tables for `x(t)=Σ` and `y(t)=Σ`.
- Each harmonic: **frequency · amplitude · phase · rotation · offset**.
- Add / remove / reorder harmonics live; each row is a mini-panel.
- Epicycle visualization mode (rotating vector chain) as a render pass.
- Mutation can add/remove/perturb individual harmonics.

---

## 8. Geometry Operators (`operators/geometry/`)

Pure `Curve[] → Curve[]`. Order matters; stack is user-editable
(add, remove, reorder, toggle).

Implemented (8):

| id | Effect |
|---|---|
| `transform` | translate / rotate / scale |
| `symmetry` | n-fold rotational symmetry |
| `resample` | arc-length uniform resample to N points |
| `offset` | perpendicular offset (positive/negative) |
| `deform` | expression-driven warp `dx(x,y,time)`, `dy(x,y,time)` |
| `project` | project onto circle or line |
| `stroke` | polyline → outline polygon (round/miter joins) |
| `boolean` | union / difference / intersection (closed curves, `polygon-clipping`) |

Planned (post-v0.1): `clip` (rect/circle window).

## 9. Topology Operators (`operators/topology/`)

These modify structure, not appearance.

Implemented (2):

| id | Effect |
|---|---|
| `repeat` | n-fold radial / grid / polar / mirror / recursive repeat |
| `voronoi` | dense-sample Voronoi tessellation of the curve envelope (`d3-delaunay`) |

Planned (post-v0.1): `intersections`, `self-intersections`, `ribbon`,
`offset-ribbon`, `centerline`, `skeleton` (medial-axis approx).

Detected intersection points become first-class geometry (`meta`) usable
by visualization and downstream operators.

---

## 10. Live Mathematics (`analysis/` + overlays)

Computed on arc-length-uniform samples via finite differences:

tangents · normals · curvature κ · radius of curvature 1/κ ·
inflection points (κ sign change) · arc length · area (shoelace) ·
centroid · winding number.

Every overlay is individually toggleable. Telemetry shows the active
equation(s), parameter values, point count, arc length, per-stage ms.

## 11. Visualization Modes (`render/passes/`)

Render passes registered as of 2026-10-24:

|| Pass id | Source | Implements |
|---|---|---|
| `stroke` | `render/passes/core.js` | Main monoline stroke (curve) |
| `gradient-wireframe` | `render/passes/gradient.js` | Height/radius color ramp wireframe |
| `points` | `render/passes/core.js` | Sampled points |
| `wireframe` | `render/passes/core.js` | Control polygon / segments |
| `normals` / `tangents` | `render/passes/vectors.js` | Per-sample normal & tangent vectors |
| `curvature-heatmap` | `render/passes/fields.js` | κ-magnitude heatmap along curve |
| `epicycles` | `render/passes/epicycles.js` | Fourier rotating-vector visualization |

Overlays (always drawn on top, independently toggleable, in
`viz/overlays.js`):

| id | Effect |
|---|---|
| `inflections` | Mark κ sign-change points |
| `samplePoints` | Lightly scatter every Nth sample |
| `ruler` | Per-curve arc-length ruler |
| `bbox` | Bounding box of all curves |

**Multiple modes coexist** — each is an independent, composable render
pass with its own z-order. Overlays are a separate layer stacked above
the active passes.

> **Future passes (planned, not yet implemented):** `signed-distance`,
> `offset`, `skeleton`, `negative-space`, `topology-graph`. Each is a
> 30-line `RenderPasses.register({...})` once the supporting operator
> (§8/§9) is in place.

### Orthographic projections

`document.view.projection` is `3d | xy | xz | yz`. The engine keeps full 3D
points (`x3`, `y3`, `h3`) and the renderer drops the perpendicular axis at
draw time, fitting the projected bbox with the generator `fit` value. No
re-evaluation occurs on view switch. `view.colorRamp` is an optional array
of 2–6 hex colors for the gradient pass; the default is yellow → purple →
blue.

## 12. Animation

- `time` is injected into **every** expression and every generator.
- Every numeric parameter is an **AnimatableValue**: a constant *or* an
  expression of `time` (e.g. `3 + 0.5*sin(0.7*time)`).
- Transport: play / pause / reset / speed / loop. Fully time-driven
  (never accumulative) ⇒ scrubbing is exact and deterministic.
- Glyph becomes a living mathematical object.
- Tier 2: PNG-sequence / SVG-frame export.

## 13. Mutation Engine v2

Operates on the `GlyphDocument`, never on output geometry:

- numeric params: gaussian perturbation, schema-clamped (v1 behavior);
- harmonic tables: add / remove / perturb harmonics;
- expressions: perturb **numeric literals inside the AST** (equation-space
  mutation, always syntactically valid);
- validation: pipeline evaluates cleanly, samples finite, budgets held;
  invalid candidates re-rolled (v1 pattern).

Generates endless families of mathematically related glyphs.

## 14. Presets

Mathematical presets, each a complete Parametrica document (with
`app: 'parametrica'`):

Lissajous 3:5 · Golden Rose · Infinity · Spirograph · Butterfly ·
Superformula Star · Superformula Flower · Hypotrochoid ·
Fourier Capsule · Fourier Butterfly · Helix Lab (Básica, Radio Variable,
Paso Variable, Ondulada, Doble Hélice, Cónica).

v1 Glyph Lab presets migrate automatically → `bilateral-spline` documents
through the dual-format read (§4.4).

## 15. Custom Formula Editor

- Live textarea-based field (`ui/widgets/ExpressionField.js`), one per
  expression / source parameter.
- Live re-compilation (debounced ~150 ms); compile errors are surfaced
  through `controls.showErrors()` with `{ message, key }` tagging.
- Multi-line mode for `TYPE.SOURCE` parameters (`custom` generator);
  single-line for `TYPE.EXPRESSION`.
- Inline error spans (`{ start, end }`) are produced by the expression
  engine (§5) and the API is ready for inline highlighting once the
  editor upgrades from textarea to a syntax-aware component.
- **Planned upgrade (M3 polish):** swap textarea for CodeMirror 6 with
  the expression tokenizer as the syntax highlighter. Adds the
  `@codemirror/*` dependency from §3 when the upgrade lands.

## 16. UI

Carried from v1: Swiss-modernist black instrument, lil-gui, telemetry.

New: generator selector · schema-built parameter panel (v1 pattern,
rebuilt per generator) · operator-stack panel (add/remove/reorder/toggle)
· per-pass visualization checkboxes · animation transport · harmonic
table editor · formula editor drawer · undo/redo (50 snapshots, coalesced)
· seed field + reroll · transient notices for import/preset failures ·
Analysis panel with deterministic descriptor metrics and parameter influence ·
Notebook with checkpoints, thumbnails, lineage and A/B comparison ·
Explore with Solo/Lock, seeded randomize and a 1D variation strip ·
Artboard presets, palettes, stroke/fill style and faithful export ·
2D grids and same-structure morphing · Document v3 layers, per-layer styles
and multi-layer export · Timeline keyframes, easing and frame-sequence export · Helix Lab
(generalized helix, orthographic projections, gradient wireframe) ·
Offline advisor with deterministic narration and grounded suggestions ·
Optional LLM advisor with fake/Ollama/OpenAI-compatible providers, grounded
prompts, validated responses, caching and privacy disclosure · Local image
underlay with threshold preview and contour-to-Fourier tracing · User-guided
evolution with numeric crossover, structural mutation and generation lineage.

## 17. Export

SVG (one `<path>` per curve, clean coordinates, Parametrica document
embedded as XML comment under `<!-- parametrica document: … -->`) ·
PNG (HiDPI canvas) · JSON (ParametricaDocument) · clipboard JSON.
Tier 2: animation frame sequences.

---

## 18. Directory Layout

```
src/
  core/        engine · registry · document · params schema
  math/        tokenizer · parser · ast · stdlib · seeded noise
  generators/  one module per generator + index (auto-register)
  sampling/    adaptive · arc-length · normalize
  operators/
    geometry/  one module per operator
    topology/  one module per operator
  analysis/    differential geometry · intersections
  render/      P5Renderer · passes/
  viz/         overlays
  animation/   transport · animatable values
  ai/          offline rules · prompts · providers · cache
  input/       local image → contour → Fourier
  lab/         descriptor · notebook · exploration · evolution
  mutation/    MutationEngine
  presets/     built-in GlyphDocuments · v1 migration
  export/      SVG · PNG · JSON
  ui/          Controls · OperatorStack · FormulaEditor · HarmonicTable
```

Every directory is independently extensible; adding a file that
self-registers is the *only* step required to extend the engine.

---

## 19. Testing Strategy

v1 pattern extended — the entire core stays DOM-free and Node-runnable:

- **Parser:** golden AST/eval tests, error-span tests.
- **Per-generator invariants:** finite samples, expected closure,
  symmetry under symmetric parameters, domain coverage.
- **Operator contracts:** curve counts, bbox behavior, idempotence where
  applicable (normalize∘normalize = normalize).
- **Determinism:** same seed + document ⇒ bit-identical samples.
- **Performance budget:** reference geometry document targets < 16 ms
  locally (CI gate < 50 ms). Differential analysis is computed lazily
  and only when diagnostics need it.
- **Document round-trip:** serialize ⇒ parse ⇒ deep-equal.
- **Browser regressions:** Playwright starts Vite automatically; the UI
  suite covers Fourier harmonics, array-safe render modes, inline errors,
  lazy analysis, undo, seed, preset-panel idempotence and the lab observer.
- **Lab observer:** canonical SHA-256 document hash, descriptor metrics,
  parameter docs and sensitivity ranking (unit group 14).
- **Lab notebook:** reproducible checkpoints, thumbnails, lineage, A/B
  comparison and persistence (unit group 15).
- **Lab exploration:** 1D sweeps, Solo/Lock, seeded randomize and
  candidate adoption through history (unit group 16).
- **Artboard/style:** letterboxed artboard, palette presets, stroke/fill
  renderer and export fidelity (unit group 17).
- **Grid/morph:** row-major 2D candidate maps and same-structure parameter
  morphing (unit group 18).
- **Composition layers:** v3 layer graph, isolated evaluation and layered
  export (unit group 19).
- **Motion timeline:** keyframe resolution, easing, loop and frame times
  (unit group 20).
- **Offline advisor:** descriptor-aware narration, rule suggestions and
  schema validation (unit group 21).
- **Optional LLM advisor:** provider abstraction, grounded prompts, response
  parsing/validation, cache and offline fallback (unit group 22).
- **Image trace:** local grayscale/threshold, largest-contour extraction,
  RDP/resampling, Fourier fitting and document privacy (unit group 23).
- **Evolution:** bounded parent/child budgets, numeric crossover, structural
  operator mutation, full child evaluation and lineage (unit group 24).
- **v1 migration:** every v1 preset converts to a valid document.

---

## 20. Milestones

Implementation status as of **2026-10-23** (v0.1.0 + reliability hardening):

| MS | Scope | Status | Evidence |
|---|---|---|---|
| **M1 — Core pipeline** | Types, registries, expression engine, sampler, 4 generators (parametric, polar, lissajous, rose), stroke renderer, dynamic GUI, JSON presets | ✅ **Done** | `lab.smoke.mjs` groups 1–3, 6; all checks pass |
| **M2 — Generator library + geometry ops** | Superformula, fourier (basic), trochoids, spirograph, harmonic, noise, catmull-rom/bezier/cubic, bilateral-spline migration, T1 geometry operators, differential analysis + overlays (tangents/normals/curvature comb/inflections) | ✅ **Done** | 23 generators registered, 31 operators, `analysis/differential.js`, 4 overlays |
| **M3 — Laboratory features** | Fourier lab UI + epicycles, harmonic table editor, formula editor w/ highlighting, animation transport + animatable params, T1 topology operators, mutation v2, built-in preset library, viz modes | ✅ **Done** — animation, mutation v2, presets, harmonic editor, formula editor (textarea-based, CodeMirror still deferred), operator stack reorder/toggle, 11 render passes, 4 overlays, undo/redo | `lab.smoke.mjs` groups 8–10, 13; `e2e/ui.spec.js` |
| **M4 — Heavy geometry** | Booleans, voronoi, skeleton/medial axis, centerline, stroke expansion, signed-distance pass, negative-space pass, frame-sequence export | 🟡 **Partial** — boolean, voronoi, skeleton, medial-axis, centerline, stroke expansion, signed-distance and negative-space are shipped; frame-sequence export remains deferred | Source tree + `e2e` |

### What ships in v0.1.0

The 11 acceptance criteria from §22 below are the gate. M3 and M4 items
explicitly marked "planned" above are not blockers — they are polish
features deferred to v0.x. The MVP that ships is everything M1+M2 plus
the M3 user-facing surfaces (animation, mutation, presets, formula
editor, operator stack) at functional parity, with heavy geometry
(boolean + voronoi + stroke expansion) already usable.

> **v0.1.0 vs Glyph Lab v2.0.0:** v0.1.0 is the same engine under a new
> brand identity and a renumbered version. No engine changes shipped in
> the rename — the previous v2.0.0 work becomes the seed for v0.1.0.
> The `app: 'glyph-lab'` document id and the
> `glyph-lab.presets.v2` storage key are both honored on read; writes
> emit `app: 'parametrica'` and the `parametrica.presets.v0` storage
> key (§4.4).

---

## 21. Non-Goals

- No drawing tools of any kind (pen, brush, anchors, direct manipulation).
- No nested layer groups, masks or typography. Layers, color and per-layer
  styles are supported; complex compositing remains out of scope.
- No server, no accounts, no cloud preset sync.
- No WebGL / WASM until profiling proves the CPU pipeline insufficient.

---

## 22. Acceptance Criteria

1. Type `x(t)=sin(3t)+0.25·sin(11t)`, `y(t)=cos(2t)−0.4·cos(7t)` → glyph
   renders live, normalized and centered.
2. Switch generator → entire parameter panel + mathematical model swaps.
3. Add harmonics interactively → curve reshapes live; epicycles visible.
4. Stack operators (mirror → radial-repeat → smooth) → procedural,
   reorderable, serializable.
5. Toggle curvature heatmap + inflection markers → correct overlays.
6. Press play → any parameter expressed in `time` animates; scrub exact.
7. Mutate → new valid document in the same mathematical family.
8. Save preset → JSON document; share → import on another machine ⇒
   identical glyph.
9. Export SVG → clean paths, document embedded.
10. Every v1 preset still loads (via `bilateral-spline` migration).
11. Full test suite green; pipeline under budget.

---

*A form is not drawn. A form is parameterized.*
