# Architecture

This document explains **how Parametrica is wired together**. It assumes
you've read [SPEC.md](../SPEC.md) and are ready to dig into the code.
For "how do I add X" see [CONTRIBUTING.md](../CONTRIBUTING.md). For
"how do I run it" see [README.md](../README.md).

---

## 1. Mental model

Parametrica is a **pipeline compiler for visual mathematics**. The
input is a JSON document (generator + operator stack + view settings).
The output is a list of polylines drawn on a canvas.

```
document (JSON)
   │
   ▼
evaluate(document, ctx)        ◄── per-stage cache
   │
   ├─ generator.sample(params, ctx)         → Curve[]
   ├─ operator[0].apply(curves, params, ctx)
   ├─ operator[1].apply(curves, params, ctx)
   ├─ …
   ├─ analyzeAll(curves)                    → analysis
   ├─ enforceBudget(curves)
   │
   ▼
{ curves, analysis, errors, stats, bbox }
```

The pipeline is pure: it has no UI dependencies and runs in Node. The
renderer (`P5Renderer`) reads the result and draws it; nothing in the
core knows that p5 exists.

---

## 2. Module map

```
src/
├── main.js                       entry point
├── core/
│   ├── App.js                    composition root (holds document, evaluation)
│   ├── engine.js                 evaluate(document, ctx) → result
│   ├── registry.js               Generators / Operators / RenderPasses
│   ├── schema.js                 parameter schema + TYPE enum
│   └── document.js               createDocument / sanitizeDocument
│
├── math/
│   ├── expression.js             Pratt parser + evaluator (NO eval/Function)
│   ├── stdlib.js                 pi, tau, sin/cos/lerp/clamp/noise/…
│   ├── noise.js                  seeded simplex noise (mulberry32 PRNG)
│   └── curves.js                 Catmull-Rom → Bézier helpers
│
├── sampling/
│   └── sampling.js               uniform / adaptive / arc-length resample
│
├── analysis/
│   ├── differential.js           tangents, normals, curvature, inflections
│   └── intersections.js          (reserved)
│
├── generators/                   14 modules, one per mathematical model
│   ├── index.js                  side-effect imports
│   ├── helpers.js                compileOrThrow, makeScope, sampleParametric
│   ├── parametric.js             x(t), y(t)
│   ├── polar.js                  r(θ)
│   ├── custom.js                 multi-line programs
│   ├── lissajous.js
│   ├── rose.js
│   ├── superformula.js
│   ├── fourier.js                harmonic tables
│   ├── harmonicOscillator.js
│   ├── trochoids.js              hypo + epi + spirograph
│   ├── noiseField.js             integral curves through flow field
│   ├── splines.js                catmull-rom + bezier + cubic-spline
│   └── bilateralSpline.js        v1 legacy, preserved
│
├── operators/
│   ├── index.js                  side-effect imports
│   ├── geometry/                 visual transformations (Curve[] → Curve[])
│   │   ├── transform.js          translate / rotate / scale
│   │   ├── symmetry.js           n-fold rotational symmetry
│   │   ├── resample.js           arc-length uniform resample
│   │   ├── offset.js             perpendicular offset
│   │   ├── deform.js             expression-driven warp
│   │   ├── project.js            project onto circle / line
│   │   ├── stroke.js             polyline → outline polygon
│   │   └── boolean.js            union / difference / intersection
│   └── topology/                 structural transformations
│       ├── repeat.js             radial / grid / polar / mirror / recursive
│       └── voronoi.js            curve-envelope Voronoi tessellation
│
├── render/
│   ├── P5Renderer.js             p5 sketch, animation clock, pass composer
│   └── passes/
│       ├── core.js               stroke / points / wireframe
│       ├── vectors.js            normals / tangents
│       ├── fields.js             curvature heatmap
│       └── epicycles.js          rotating-vector visualization
│
├── viz/
│   └── overlays.js               inflections / samplePoints / ruler / bbox
│
├── animation/
│   └── animatable.js             AnimatableValue resolution (number | {expr})
│
├── mutation/
│   └── MutationEngine.js         parameter-space perturbation
│
├── presets/
│   ├── PresetManager.js          built-ins + user storage + JSON I/O
│   └── builtins.js               7+ built-in mathematical families
│
├── export/
│   └── Exporter.js               SVG (path-embedded document) · PNG · JSON
│
├── ui/
│   ├── Controls.js               instrument panel
│   └── widgets/
│       ├── ExpressionField.js    live formula editor
│       ├── HarmonicsEditor.js    Fourier table editor
│       └── OperatorStack.js      add/remove/reorder/toggle operators
│
└── geometry/                     v1 Catmull-Rom + Mirror + OpticalCorrection
                                  (used only by bilateral-spline generator)
```

---

## 3. Data flow in detail

### 3.1 Document creation

```
createDocument('parametric')
   │
   ▼
{ version, app, name, seed,
  generator: { id, params, mods },
  operators: [],
  view: { modes: ['stroke'], ... },
  animation: { playing: false, speed: 1, time: 0 } }
```

`sanitizeDocument(raw)` accepts raw input (presets, JSON imports) and
produces a complete valid document. It's defensive: unknown generator
ids fall back to `'parametric'`, unknown operators are dropped, params
are coerced to schema types.

### 3.2 Evaluation

```
App.setGenerator(id)            ◄── user picks "Lissajous 3:5"
   │
   ▼
App.setGenerator mutates document.generator
   │
   ▼
App.rebuild() → App.evaluate()
   │
   ▼
evaluateDocument(document, { time })
   │
   ├─ ctx = { time, seed, scope = createStdlib(seed) }
   │
   ├─ generator.sample(params, ctx)         → Curve[]
   │     │
   │     ▼
   │   compile user expressions (cached by source string)
   │   sample function over domain
   │   post-process: fit / center
   │
   ├─ for each operator in document.operators:
   │     operator.apply(curves, params, ctx)
   │
   ├─ sanitizeCurves: drop non-finite / degenerate
   ├─ enforceBudget: decimate if points > 50k/curve, 200k total
   ├─ analyzeAll: tangents, normals, κ, inflections, arc length
   │
   ▼
{ curves, analysis, errors, stats, bbox }
   │
   ▼
App._evaluation = result
Controls.showErrors(errors)
Telemetry updated
```

The engine memoizes per stage. If only the time changes (animation),
or only one stage's params change, downstream stages re-run but
upstream stages reuse their previous output:

```js
evaluateDocument._cache = {
  documentRef,           // identity check
  time,
  signatures: [hashGenerator, hashOp0, hashOp1, …],
  stageOutputs: [curvesAfterGen, curvesAfterOp0, …],
}
```

When `time` changes, no cache hit (time flows into every stage). When
a slider moves, only stages from the changed one downward re-evaluate.

### 3.3 Rendering

```
P5Renderer.drawFrame(p)
   │
   ├─ if doc.animation.playing: app.setTime(t + dt × speed)
   │
   ├─ p.background(0)
   ├─ p.translate(centerX, centerY)
   │
   ├─ if doc.view.guides: drawGuides(p)
   │
   ├─ for each modeId in doc.view.modes:
   │     RenderPasses.get(modeId).draw(p, data)
   │
   ├─ drawOverlays(p, data)        ◄── independent overlay layer
   │
   ▼
frame painted
```

Passes are independent and composable. Overlays are a separate layer
on top. Either can be toggled live; either can throw without taking
down the rest of the frame (caught + logged).

### 3.4 Mutation

```
MutationEngine.mutate(document)
   │
   ▼
candidate = structuredClone(document)
   │
   ├─ perturb generator numeric params (gaussian, schema-clamped)
   ├─ perturb generator expression params (perturbLiterals)
   ├─ perturb each operator's params (same)
   ├─ if fourier: perturb harmonic rows, occasionally add/remove
   ├─ occasionally re-roll seed
   │
   ▼
if evaluateDocument(candidate).errors == 0 AND bbox valid AND budget ok:
  return candidate
else:
  retry up to 40 times; if all fail, return original document
```

The "evaluate-then-accept" pattern guarantees the mutation engine can
never produce a broken form. This is what makes pressing *Mutate*
feel safe.

---

## 4. Design decisions

### Why registries instead of switch statements?

Each generator, operator, and render pass is a self-contained module
that registers itself. The engine never has an `if (id === 'foo') …`
clause. Adding a stage is one new file + one import line in `index.js`.

The tradeoff: a tiny bit of indirection (lookup by id at runtime) for
zero central coupling. The gain scales linearly with the number of
stages.

### Why a custom expression engine?

We never want `eval()` or `new Function()` to touch user input. A small
Pratt parser gives us:

- **Safety**: only the injected scope is reachable.
- **Errors with spans**: `{ start, end }` carries source positions for
  inline UI highlighting.
- **Speed**: compiled expressions cache by source string (LRU at 300).
- **Determinism**: same source + same scope ⇒ same result. Always.

Cost: ~330 lines and a couple hundred AST tests. The math libraries
(`sin`, `cos`, `noise`, `clamp`, `lerp`) are plain JS values injected
into the scope — no parser work needed for them.

### Why mutation in parameter space only?

Because **the document is the form**. Mutating paths (the v1 approach)
violates the user's intent (move one slider, expect the family to
shift) and makes the mutation engine unpredictable. By mutating
*parameters*, we stay inside the mathematical family the user chose.

The validator (`isValid(candidate)`) runs the full pipeline on the
candidate before accepting it. If `time = 0.5` produced a form, mutating
should never produce a form that breaks at `time = 0.5`.

### Why per-stage caching?

Slider drags fire 60 times per second. Re-evaluating 14 generators +
10 operators from scratch on every drag is wasteful. The cache keys
on `(stage.id, stage.params, stage.mods, stage.enabled)` JSON-stringified.
A slider drag invalidates exactly one stage and everything downstream.

Animation (time-driven) bypasses the cache: time flows into every
stage, so signatures always change.

### Why no UI framework?

Parametrica's UI is one panel (the right-side instrument) + one canvas.
The panel is built from a DOM tree in `Controls.js`; lil-gui handles
the boring parts (sliders, selects, folders). A full framework would
add a dependency for almost no benefit.

If the panel grows to multiple panes (planned: separate "library",
"playground", "inspector" modes), the next step is probably **Preact**
or **Svelte** with islands. Not React.

### Why black on black?

Black-on-white monoline is the visual grammar of vector tools
(Illustrator, Inkscape, CAD). It's also the lowest-noise canvas:
no colour system, no layers, no compositing surprises. The Swiss-red
accent (`#e30613`) is the only chromatic note and it's reserved for
**state** (validation errors, the *Mutate* button).

---

## 5. Performance

The pipeline budget: full evaluation under **16 ms** for ≤ 20 000 samples
(see SPEC.md G5). The test suite enforces this in group 11 (`performance`).

Hot paths and their costs:

| Operation | Cost | Mitigation |
|---|---|---|
| User expression compilation | ~1 ms / source | LRU cache (300 entries) |
| Parametric sampling | O(samples × expr-cost) | Adaptive sampling only where needed |
| Adaptive subdivision | O(samples × depth × expr-cost) | `maxDepth: 5` cap |
| Resample (arc-length) | O(samples) | Pre-computed arc-length table |
| Differential analysis | O(samples) | Streaming pass |
| Voronoi topology | O(samples log samples) | Optional, opt-in via operator stack |
| Boolean ops | O(vertices log vertices) | Optional, only when added |

Bundle weight is dominated by p5 (~700 KB minified). Lazy-loading p5
behind a dynamic import is the planned v0.x optimization.

---

## 6. Testing

### What the suite covers

11 groups in `test/lab.smoke.mjs`:

| # | Group | What it verifies |
|---|---|---|
| 1 | expression engine | precedence, right-assoc, unary, stdlib, error spans, perturbation |
| 2 | noise determinism | same seed = identical field, different seed ≠ same field |
| 3 | splines | Catmull-Rom → Bézier conversion, cubic spline |
| 4 | generators | evalOK over all 14 registered models + variations |
| 5 | operators | each operator transforms validly, idempotence where applicable |
| 6 | documents | round-trip identical, hostile input survives, **dual-format read** |
| 7 | built-in presets | all 7+ presets evaluate to non-degenerate forms |
| 8 | mutation | chained mutations across families never break the pipeline |
| 9 | SVG export | output is well-formed, document is embedded |
| 10 | animation | time-driven resolution, deterministic across time |
| 11 | performance | full pipeline under 16 ms |

451 checks total.

### Adding tests

Append to `lab.smoke.mjs` in the appropriate group. Helpers:

```js
function assert(cond, msg)         // single check
function evalOK(doc, label)        // full evaluation smoke test
```

For specific assertions on individual curves:

```js
const { curves, errors, stats, bbox } = evaluateDocument(doc, { time: 0 });
assert(errors.length === 0, '...');
assert(curves.length === 2, '...');
assert(bbox.diagonal > 100, '...');
```

The whole core is imported and exercised in Node — no browser, no
canvas, no DOM.

---

## 7. Extending safely

When you add something:

1. **Place it in the right directory** (see `CONTRIBUTING.md` table).
2. **Register it via the registry** (`Generators.register({...})` etc.).
3. **Wire the import** in the corresponding `index.js`.
4. **Cover it in the smoke suite** — at minimum, `evalOK` on the
   default document.
5. **Document it in SPEC.md** if it adds a new public id to the registry.

The engine, UI, and tests don't need to change. That's the contract.
