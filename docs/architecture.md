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
   ├─ planar generator.sample(...)           → Curve[] (plane)
   ├─ spatial generator.generate(...)        → world Curve3D / Surface
   ├─ world operators → view operators
   ├─ enforceBudget(...)                     → after every stage
   ├─ analyzeAll(...)                        → lazy on `analysis` access
   │
   ▼
{ curves, geometry, space, errors, stats, bbox }

        │ buildRenderScene(evaluation, view)
        ▼
{ transform, layers, meta }    ◄── one artboard-space scene
        │
        ├─ canvas (p5)
        ├─ SVG
        └─ plotter SVG
```

The pipeline is pure: it has no UI dependencies and runs in Node. The
renderer (`P5Adapter`) reads the scene and draws it; nothing in the
core knows that p5 exists.

---

## 2. Module map

```
src/
├── main.js                       entry point
├── core/
│   ├── engine.js                 evaluate(document, ctx) → result (v3 layers)
│   ├── registry.js               validated Generators / Operators / RenderPasses
│   ├── capabilities.js           declarative spatial/projection capabilities
│   ├── schema.js                 parameter schema + TYPE enum + clamping
│   ├── history.js                bounded undo/redo snapshots
│   ├── session.js                debounced local session snapshots
│   └── document.js               createDocument / sanitizeDocument / layers
│
├── math/
│   ├── expression.js             Pratt parser + evaluator (NO eval/Function)
│   ├── stdlib.js                 pi, tau, sin/cos/lerp/clamp/noise/…
│   ├── noise.js                  seeded simplex noise (mulberry32 PRNG)
│   ├── periods.js                gcd/lcm and exact closing periods
│   └── curves.js                 Catmull-Rom → Bézier helpers
│
├── sampling/
│   ├── sampling.js               uniform / adaptive / arc-length resample
│   └── parametric.js             sampleParametric / postProcess / closure
│
├── analysis/
│   ├── differential.js           tangents, normals, curvature, inflections
│   └── intersections.js          segment crossings (topology pass)
│
├── lab/
│   ├── hash.js                   canonical JSON + pure SHA-256
│   ├── descriptor.js             deterministic figure descriptor (v1)
│   ├── sensitivity.js            ±delta parameter influence
│   ├── notebook.js               checkpoints, projects, series and lineage
│   ├── notebookRepository.js     repository boundary + versioned migration
│   ├── workspace.js              active project/series save target
│   ├── parameters.js             shared ParameterRef helpers
│   ├── parametricSummary.js      active-shape property summary
│   ├── exploration.js            Solo/Lock, sweeps and seeded randomize
│   ├── evolution.js              crossover, structural mutation and lineage
│   └── diff.js                   document and descriptor diffs
│
├── application/
│   ├── App.js                    composition root (document, commands, use cases)
│   ├── renderSceneBuilder.js     evaluation + view → RenderScene
│   └── animationController.js    transport/clock only
│
├── geometry/
│   ├── contracts.js              Curve2D/Curve3D/Surface/Mesh/Solid
│   ├── validate.js               geometry + mesh + solid validation
│   ├── relations.js              lift, tessellate, mesh→solid
│   ├── surfaceTessellation.js    Surface → Mesh, seams and twists
│   ├── uvDomain.js               read-only Surface domain summaries
│   ├── wireframe.js              deterministic mesh iso-lines
│   ├── legacy.js                 Curve[] compatibility adapters
│   ├── transform.js              world-space transforms
│   └── analysis.js               world curve analysis
│
├── view/
│   ├── camera.js                 pinhole camera + project3D
│   ├── transform.js              P/W/A contracts, effective camera, frame
│   ├── spatialReference.js       axes/ground geometry, reference extent
│   ├── projection.js             camera/orthographic world projection
│   └── cameraController.js       orbit/zoom state transitions
│
├── generators/                   24 registered models across 17 modules
│   ├── index.js                  side-effect imports
│   ├── helpers.js                compatibility facade for focused helpers
│   ├── context.js                compileOrThrow / makeScope
│   ├── compose.js                composeCurves / multi-curve generators
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
│   ├── attractors.js             lorenz / clifford / dejong / aizawa
│   ├── concentricEllipses.js     multi-curve families
│   ├── parametric3D.js           projected x/y/z curves
│   ├── helix.js                  generalized helix + true 3D metadata
│   ├── parametricSurface.js      x(u,v), y(u,v), z(u,v) world Surface
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
│   ├── Renderer.js               backend contract
│   ├── p5/P5Adapter.js           lazy p5 backend, pass composer, quad view, post-layout canvas fit
│   ├── thumbnail.js              plain-canvas candidate previews
│   ├── projection.js             legacy curve projection compatibility
│   ├── camera3d.js               compatibility re-export of view/camera
│   ├── scene.js                  backend-neutral RenderScene contract
│   ├── reference.js              quiet axes/ground renderer
│   ├── palettes.js               artboard presets, curated/custom palette store
│   └── passes/
│       ├── core.js               stroke / points / wireframe
│       ├── gradient.js           metric-aware gradient wireframe
│       ├── vectors.js            normals / tangents
│       ├── fields.js             curvature heatmap
│       └── epicycles.js          rotating-vector visualization
│
├── viz/
│   └── overlays.js               inflections / samplePoints / ruler / bbox
│
├── ai/
│   ├── offline.js                deterministic narration, rules and validation
│   ├── prompt.js                  grounded system/user payloads
│   ├── provider.js                fake, Ollama and OpenAI-compatible adapters
│   └── cache.js                   bounded in-memory response cache
│
├── input/
│   └── imageTrace.js              grayscale, threshold, contour and Fourier tracing
│
├── animation/
│   ├── animatable.js             AnimatableValue resolution (number | {expr})
│   └── timeline.js               keyframes, easing, frame times
│
├── mutation/
│   └── MutationEngine.js         parameter-space perturbation
│
├── presets/
│   ├── PresetManager.js          built-ins, user storage, usage meta + previews
│   ├── preview.js                deterministic preview key + rasteriser
│   ├── catalog.js                categories, descriptions and tags
│   └── builtins.js               40 built-in mathematical families
│
├── export/
│   ├── Exporter.js               SVG (pass-embedded document) · plotter SVG · PNG · GIF · JSON
│   ├── svgContext.js             p5-like SVG recorder for passes and overlays
│   ├── gif.js                    GIF89a encoder, global palette and frame cap
│   ├── geometryExport.js         Mesh/Solid exporter contract for STL/3MF
│   └── zip.js                    frame-sequence ZIP writer
│
├── ui/
│   ├── ParametricOverlay.js      canvas-edge property HUD
│   ├── UVDomainInset.js          compact surface parameter-domain chart
│   ├── Controls.js               mode bar, accordions and instrument panel
│   ├── dialogs.js                injectable prompt / confirm service
│   ├── params/
│   │   ├── ParamRegistry.js      number / boolean / select / expression types
│   │   └── StageEditor.js        shared binding, modulation and expressions
│   └── widgets/
│       ├── ExpressionField.js    CodeMirror 6 math editor
│       ├── HarmonicsEditor.js    Fourier table editor
│       ├── OperatorStack.js      add/reorder/toggle operators + expressions
│       ├── LabPanel.js           metrics + parameter-influence panel
│       ├── NotebookPanel.js      checkpoints, thumbnails and A/B compare
│       ├── ExplorePanel.js       axis, scope, strip and candidate adoption
│       ├── EvolutionPanel.js     parents, generations, previews and keeping children
│       ├── TimelinePanel.js      tracks, keyframes, record, PNG/GIF/SVG frame export
│       ├── AdvisorPanel.js       provider settings, privacy, advice, preview and apply
│       ├── ImagePanel.js         underlay controls, threshold preview and Fourier trace
│       └── modeToggles.js        array-safe render-mode helpers
│
└── geometry/legacy/              v1 Catmull-Rom + Mirror + OpticalCorrection
                                  (used only by bilateral-spline generator)
```

### Extension points

```
New generator        → register a definition with params + capabilities + sample
New operator         → register params + apply; expression/source fields are automatic
New parameter type   → ParamRegistry.register(type) + editor binding
New storage backend  → NotebookRepository (load/save/clear)
New spatial model    → capabilities.spatial = true (no core id checks)
```

Registries validate definitions at load time. Generator hooks
(`previewParams`, `syncParams`, `onExpressionChange`, `migrateParams`) are
invoked generically by the StageEditor. `src/core` must never import UI
widgets; panels consume the workspace and dialog services.

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
   ├─ stage cache key includes seed, time, quality, camera, stage state
   │
   ├─ generator.sample(params, ctx)         → Curve[]
   │     │
   │     ▼
   │   compile user expressions (cached by source string)
   │   sample function over domain
   │   post-process: split discontinuities + legacy centering
   │   engine: applyPlaneFit once when the generator has a fit hint
   │
   ├─ for each operator in document.operators:
   │     operator.apply(curves, params, ctx)
   │
   ├─ sanitizeCurves: drop non-finite / degenerate
   ├─ enforceBudget after EVERY stage: 50k/curve, 200k total
   ├─ cheap stats: pointCount / arcLength / bbox (eager)
   ├─ analyzeAll: tangents, normals, κ, inflections (lazy getter)
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

### 3.3 Coordinate spaces and framing

Parametrica distinguishes three authoring spaces and two presentation
transforms. They are contracts, not new geometry types:

| Space | Meaning | Owner |
|---|---|---|
| **P** — parameter | `u,v` or `t` domain | generator schema / `Surface.domain` |
| **W** — world | canonical `x,y,z` geometry | spatial generators, world operators |
| **A** — artboard | abstract page units consumed by every backend | `ViewTransform` / `RenderScene` |

```
P --generator--> W --camera/orthographic--> A --renderer--> device px
                                      │
                                      └--plotter scale--> millimetres
```

`src/view/transform.js` owns the single `ViewTransform` implementation:

- it resolves one **effective camera** for the scene (the document camera
  plus the automatic near-plane pull-back);
- it projects world points to view space;
- it applies one **frame** (`scale`, `tx`, `ty`) to produce artboard units;
- it exposes `toArtboard()`, `toDevice()` and the frame metadata used by
  future spatial references.

`src/application/renderSceneBuilder.js` is the only place that projects
spatial layers for presentation. Canvas, SVG and plotter consume the same
`RenderScene`; exporters do not re-project or re-fit.

Frame modes (`view.frame.mode`):

- **`scene`** (default): one frame for every spatial layer. Relative layer
  positions and multi-mesh positions are preserved. A single-layer document
  produces exactly the same artboard coordinates as the old per-layer path.
- **`composition`**: one frame per layer, preserving the legacy artistic
  behavior. Use it when layers are intentionally composed independently.
- **`world`**: fixed scale anchored at the world origin. This is the mode a
  future Spatial Reference needs; it is available but has no UI yet.

`fit` remains a serialized generator parameter for backward compatibility,
but it is no longer applied inside generator mathematics. The engine reads it
as a frame hint: planar generators are normalized once by `applyPlaneFit`,
and spatial generators are framed by `ViewTransform`. `fit = 0` means native
scale; the legacy centering behavior is preserved.

Planar generators keep a legacy contract: their `sample()` output is a 2D
curve in the plane. The engine fits/centers it immediately after sampling and
before operators. Spatial generators always emit world geometry and never see
the camera or the artboard.

#### Spatial reference

`view.reference` is a UI-only inspection aid:

```js
reference: { enabled: false, ground: false }
```

`src/view/spatialReference.js` builds axes, labels and an optional low-density
ground plane in world space, then projects them through the scene's
`referenceTransform`. The reference is **not** part of the artboard frame:
toggling it cannot change scale, position or fit. It is excluded from SVG,
plotter, PNG and GIF captures.

- `scene` mode: the reference uses the shared scene transform.
- `composition` mode: it follows the active spatial layer; planar active layers
  have no reference transform.
- `world` mode: the reference uses the world-anchored transform.
- Quad: each panel builds its own reference; axes appear in every panel, while
  the ground plane is restricted to the 3D and XY panels.
- Reference extent is derived from world bounds but capped by the framed view
  so a very deep shape does not push axes off-screen. The cap is presentation
  only and never feeds back into the frame.

This is deliberately separate from **CAD Guides**, which are artboard
crosshairs/margins. The reference is also not exported and does not define
physical units, snapping or a CAD grid.

#### UV Domain inset

`src/geometry/uvDomain.js` is a pure, read-only summary of the active Surface
domain. It preserves the real parameter endpoints, min/max, reversed axes,
`closedU/V`, `seamU/V` and actual grid rows/columns. It never defaults to
`[0,1]` or `[0,2π]`.

`src/ui/UVDomainInset.js` renders that summary as a compact DOM/SVG overlay in
the lower-right corner of the canvas:

- U horizontal, V vertical, with arrows following the real parameter
  direction;
- domain rectangle, low-density 4×4 grid and numeric bounds;
- closed axes shown as dashed seams; reverse seams labelled with `↺`;
- sample counts and open/closed state in the footer;
- hidden when the active layer is planar, hidden or has no valid Surface;
- toggled from Canvas and persisted as UI-only state.

The inset is presentation only. It does not touch `ViewTransform`, frame,
bbox, geometry, Spatial Reference, SVG, plotter, PNG or GIF. It is not a second
viewport and has no UV ↔ XYZ interaction.

### 3.4 Rendering

```
P5Adapter.drawFrame(p)
   │
   ├─ if doc.animation.playing: app.setTime(t + dt × speed)
   │
   ├─ p.background(0)
   ├─ p.translate(artboard center)
   ├─ p.scale(artboard → canvas)
   │
   ├─ scene = buildRenderScene(evaluation, view)
   │     ├─ project spatial layers through one ViewTransform
   │     ├─ keep planar layers as artboard-space curves
   │     └─ derive wireframes from projected meshes
   │
   ├─ if doc.view.guides and not capture: drawGuides(p)
   ├─ if image underlay and not capture: drawUnderlay(p)
   ├─ if reference enabled and not capture: draw spatial axes/ground
   │
   ├─ for each layer and modeId:
   │     RenderPasses.get(modeId).draw(p, layerData)
   │
   ├─ drawOverlays(p, scene)        ◄── independent overlay layer
   │
   ▼
frame painted
```

Passes are independent and composable. Overlays are a separate layer
on top. Either can be toggled live; either can throw without taking
down the rest of the frame (caught + logged). Quad view builds one scene
per panel with its own projection override; SVG and plotter always export
the active single projection.

### 3.5 Mutation

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

Slider drags fire 60 times per second. Re-evaluating 24 generators +
36 operators from scratch on every drag is wasteful. The cache keys
on `(seed, time, quality, camera, stage.id, stage.params, stage.mods,
stage.enabled)` JSON-stringified. A slider drag invalidates exactly one
stage and everything downstream.

Animation (time-driven) flows into the signature, so animated frames do
not reuse stage outputs even though the cache path is the same.

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

The geometry pipeline budget: under **16 ms** for ≤ 20 000 samples on
reference hardware, with the CI gate at 50 ms (see SPEC.md G5). Point
budgets are enforced after every stage (50k/curve, 200k total), and
differential analysis is lazy, so geometry-only evaluation avoids it.
The test suite enforces the reference budget in group 12 (`performance`).

Hot paths and their costs:

| Operation | Cost | Mitigation |
|---|---|---|
| User expression compilation | ~1 ms / source | LRU cache (300 entries) |
| Parametric sampling | O(samples × expr-cost) | Adaptive sampling only where needed |
| Adaptive subdivision | O(samples × depth × expr-cost) | `maxDepth: 5` cap |
| Resample (arc-length) | O(samples) | Pre-computed arc-length table |
| Differential analysis | O(samples) | Lazy getter; only diagnostics read it |
| Voronoi topology | O(samples log samples) | Optional, opt-in via operator stack |
| Boolean ops | O(vertices log vertices) | Optional, only when added |

The eager shell is split into app, CodeMirror, lil-gui and geometry-vendor
chunks (~630 KB minified / ~197 KB gzip total). p5 is dynamically imported
as a separate ~1.06 MB chunk after the shell is usable; the e2e suite waits
for `renderer.readyPromise` before touching the canvas.

---

## 6. Testing

### What the suite covers

31 groups in `test/lab.smoke.mjs`:

| # | Group | What it verifies |
|---|---|---|
| 1 | expression engine | precedence, right-assoc, unary, stdlib, error spans, perturbation |
| 2 | noise determinism | same seed = identical field, different seed ≠ same field |
| 3 | splines | Catmull-Rom → Bézier conversion, cubic spline |
| 4 | generators | evalOK over all 24 registered models + variations |
| 5 | operators | each operator transforms validly, idempotence where applicable |
| 6 | documents | round-trip identical, hostile input survives, **dual-format read** |
| 7 | built-in presets | all 40 built-in presets evaluate to non-degenerate forms |
| 8 | mutation | chained mutations across families never break the pipeline |
| 9 | SVG export | output is well-formed, document is embedded, vector passes/overlays/blend/opacity are recorded, plotter output is stroke-only and raster-only SDF is reported |
| 10 | animation | time-driven resolution, deterministic across time |
| 11 | sampling | uniform/adaptive caps, endpoint completeness, inverted domains |
| 12 | performance | reference document budget |
| 13 | reliability regressions | isolation, seed cache, clamping, budgets, errors, history, UI helpers |
| 14 | lab observer | hash vectors, descriptor metrics, symmetry, empty geometry, sensitivity ranking, shape distance |
| 15 | lab notebook | checkpoint validation, lineage, persistence, metadata editing, import/export, thumbnail cap, diffs |
| 16 | lab exploration | 1D sweep endpoints and determinism, Solo/Lock, seeded randomize, visible seed, candidate isolation |
| 17 | artboard/style | defaults, authoritative layer width, legacy stroke migration, clamping, solid/linear/radial fill gradients, custom palettes, style/artboard round-trip, styled SVG |
| 18 | grid/morph | row-major grid order/budget, deterministic grid, morph endpoints/interpolation, incompatible structures |
| 19 | composition layers | v3 migration, layer aliases, isolated evaluation, hidden layers, layer-scoped analysis, per-layer render modes, aggregate descriptor, layered SVG |
| 20 | motion timeline | interpolation/easing, frame times, loop, timeline validation, PNG/SVG frame sequences, GIF encoding and frame caps |
| 21 | offline advisor | narration/diff, grounded suggestions, validation, clamping, candidate isolation |
| 22 | optional llm advisor | fake determinism, prompt grounding, response parsing, clamping/rejection, cache, fallback, trigger policy |
| 23 | image trace | grayscale/Otsu, largest/all-component/hole tracing, boundary tracing, RDP, arc-length resampling, DFT reconstruction error, multi-layer apply, privacy |
| 24 | evolution lab | numeric crossover bounds, seeded determinism, structural mutation budget, child validation, generation lineage |
| 25 | helix lab | classic reduction, radial/pitch modulation, torsion, strands, projections, quad view, gradient metric/ramp, six presets, active-shape summary |
| 26 | session recovery | debounced snapshots, playback stripping, flush/clear, corrupt JSON and quota failures |
| 27 | registry contracts | every registry exposes the expected contract and metadata; render passes expose group, description and truthful applicability |
| 28 | extensibility boundaries | adding modules through registries does not require central edits |
| 29 | world geometry contracts | Surface/Mesh/Solid validation, conversions, analysis, camera distance and near-plane clipping |
| 30 | parametric surfaces | surface generation, normal/twisted seam welding, normals, projection, caches and render passes |
| 31 | preset library | favorites/recents persistence, preview keys/cache, deletion cleanup, metadata pruning |
| 32 | spatial contracts | P/W/A ids, frame sanitization and scales, world-origin anchoring, shared multi-mesh/multi-layer framing, scene/export parity, planarity preservation, quad reprojection |
| 33 | spatial reference | reference config, world origin, axis visibility by projection, ground divisions, frame independence, composition anchoring and planar exclusion |
| 34 | uv domain | real Surface.domain bounds, reversed/non-normalized ranges, closure/seams, invalid domains, active-layer resolution, geometry/frame/bbox independence and export exclusion |

1773 checks total.

### Panel behavior

The inspector is split into Form, Look, Explore, Perform, Ingest and Keep
modes. Sections are accordions persisted under `parametrica.ui.v1`; Generator
and Parameters open by default. Look is appearance/viewport only: Camera,
Canvas, Style, Render and Overlays. Ingest owns Image; Perform owns Animation,
Timeline, frame export and GIF export. Legacy `work` mode state is treated as
Perform, and old `view`/`artboard` section ids map to the LOOK sections.
Technical generator parameters sit behind an Advanced disclosure.
The sticky status line reports the active layer, hidden state, generator,
operator counts, modulation, timeline tracks and projection. Orthographic
projection is disabled for 2D generators and falls back to the camera view.

### Quality gates

`npm run lint` runs ESLint over `src`, `test`, `e2e` and config files.
`npm run check` combines lint, the Node suite and the production build. CI
runs lint before the unit suite.

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
