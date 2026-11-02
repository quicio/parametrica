# Parametrica

> *A form is not drawn. A form is parameterized.*

A parametric geometry workbench — discover continuous monoline forms by
exploring mathematical equations, harmonics and parameter domains. Type
an equation, see it become a line. Stack operators on top. Mutate. Animate.
Export.

Parametrica is a Swiss-modernist black instrument for computational
geometry: it sits closer to *Desmos*, *GeoGebra*, *Processing* or
*Shadertoy* than to *Illustrator*. No pen tool, no anchor editing —
mathematics is the only authoring surface.

[**Live demo**](#running-it) · [**SPEC.md**](./SPEC.md) (architecture & rationale) · [**Architecture diagram**](#architecture)

![hero placeholder](https://placehold.co/1200x600/000000/e30613/png?text=Parametrica)

---

## Quick start

```bash
npm install
npm run dev          # vite dev server, opens the app
npm run lint         # ESLint flat config
npm test             # node-only verification suite (1689 checks)
npm run check        # lint + unit + production build
npm run test:e2e     # Playwright suite (105 tests, starts Vite automatically)
npm run build        # production bundle in dist/
```

Open `http://localhost:5173` after `npm run dev`. The default document
renders the classic `x(t)=sin(3t)+0.25·sin(11t)`, `y(t)=cos(2t)−0.4·cos(7t)`
parametric pair.

Requires **Node ≥ 18** and a browser. No backend, no accounts, no telemetry
leaving your machine.

---

## What it does

| Surface | What you can do |
|---|---|
| **Generator** | Choose a mathematical model — parametric equations, polar, Fourier, superformula, lissajous, rose, hypotrochoid/epitrochoid, spirograph, noise fields, harmonic oscillators, custom multi-line programs |
| **Parameters** | Schema-built panel that swaps when you change generator. Numbers, booleans, selects |
| **Equations** | Live text fields for `x(t)`, `y(t)`, `r(θ)`, or free-form `custom` programs. Errors surface inline |
| **Harmonics** | Interactive Fourier tables with add/remove/reorder rows |
| **Operators** | Stack of pure `Curve[] → Curve[]` stages — rotate, scale, offset, radial/linear arrays, kaleidoscope, symmetry, resample, deform, project, stroke, boolean, voronoi. Reorder, toggle, add |
| **View** | Multiple render passes stack (curve, points, normals/tangents, curvature heatmap, epicycles, wireframe). Overlays: inflections, sample points, ruler, bbox |
| **Animation** | Every numeric parameter accepts `time` expressions (`3 + 0.5*sin(0.7*time)`). Play/pause/scrub/speed |
| **Mutation** | Perturbs parameters + numeric literals in equations. Always valid (re-rolled on failure) |
| **Presets** | Grouped, searchable library with derived previews, favorites and recent presets, plus user saves. Dual-format read: legacy v1 `glyph-lab` presets still load |
| **Export** | SVG (active vector passes, overlays, blend + embedded document), plotter SVG (stroke-only), PNG (faithful raster), GIF (timeline), JSON, clipboard |

---

## A 60-second tour

1. **Equations** — edit `x(t)` and `y(t)` in the Equations panel. The
   canvas updates as you type.
2. **Operators** — add `Radial Array (n=8)` from the Operators section.
   The form radiates symmetrically.
3. **Animation** — set a parameter to `{ expr: "3 + 2*sin(time)" }` via
   the modulator field (or use the `time` variable directly inside an
   equation). Press play.
4. **Mutation** — click *Mutate*. A new valid document appears in the
   same mathematical family.
5. **Export** — *Export SVG* writes the active vector passes, overlays and
   blend modes with the full document embedded as an XML comment. Signed
   Distance is the only raster-only omission; use PNG when it is active.

---

## Architecture

```
generators/  (24 registered)  one file each, self-registered
operators/   (36 registered)  geometry/ + topology/, each Curve[] → Curve[]
math/               safe Pratt-parser expression engine + seeded simplex noise
sampling/           uniform + adaptive + arc-length resampling + bbox helpers
analysis/           differential geometry: tangents, normals, curvature, inflections
lab/                descriptor, hash, sensitivity, notebook, exploration and diffs
ai/                 deterministic offline narration and suggestion rules
render/             p5 surface, artboard/palettes, thumbnails, projections and 14 passes
viz/                toggleable diagnostic overlays
animation/          AnimatableValue + timeline resolution (keyframes/easing)
mutation/           parameter-space mutation with full evaluation validation
presets/            built-in library + JSON persistence in localStorage
export/             SVG (pass-embedded document) · plotter SVG · PNG · GIF · JSON · clipboard
ui/                 instrument panel + custom widgets (expression field, harmonic editor, operator stack, mode toggles)
core/               App composition root · engine · registry · document · schema · history
geometry/           v1 Catmull-Rom + Mirror + OpticalCorrection (used by bilateral-spline generator)
```

Read **[SPEC.md](./SPEC.md)** for the full design rationale, principles
(G1–G7), pipeline contract, data types, milestone status, and acceptance
criteria. The spec is the source of truth; the code is its realization.

### Pipeline

```
generator → operator stack → analysis → stats
   │              │
   ▼              ▼
 Curves        Curves
```

Each stage is pure (`(params, ctx) → result`), DOM-free, and Node-runnable.
A per-stage memoization cache reuses the longest valid prefix when
earlier stages haven't changed.

### Document

A form is a JSON document:

```js
{
  app: 'parametrica',
  version: 3,
  name: 'Lissajous 3:5',
  seed: 1,
  activeLayer: 0,
  layers: [{
    id: 'layer-1', name: 'Lissajous 3:5', visible: true, locked: false, seed: 1,
    generator: { id: 'lissajous', params: { a: 3, b: 5, delta: 1.5708, size: 340 }, mods: {} },
    operators: [],
    style: { stroke: { color: '#ffffff', width: 2, opacity: 1, cap: 'round', join: 'round' }, fill: { enabled: false, color: '#ffffff', opacity: 1 }, blend: 'normal' },
  }],
  view: { modes: ['stroke'], overlays: {}, strokeWeight: 2, guides: true, artboard: { width: 900, height: 900, background: '#000000', margin: 0 } },
  animation: { playing: false, speed: 1, time: 0 },
}
```

Documents are the share format: save one, paste it on another machine,
get the same form bit-for-bit (determinism is enforced by seeded noise
and pure evaluation).

The legacy `app: 'glyph-lab'` id is still accepted on read for backwards
compatibility with v1 presets — but writes always emit `'parametrica'`.

---

## Adding things

Parametrica is built to grow by dropping new files into the right
directory.

| You want to… | Add a file at… | Required shape |
|---|---|---|
| Add a new mathematical model | `src/generators/<name>.js` | `Generators.register({ id, name, params, domain, sample })` |
| Add a new curve transformation | `src/operators/geometry/<name>.js` | `Operators.register({ id, apply: (curves, params, ctx) => Curve[] })` |
| Add a new structure-changing op | `src/operators/topology/<name>.js` | same as geometry |
| Add a new render mode | `src/render/passes/<name>.js` | `RenderPasses.register({ id, draw: (p5, data) => void })` |
| Add a built-in preset | `src/presets/builtins.js` | factory returning a `createDocument(...)` |

Side-effect imports in each `index.js` register every module on load.
No central config to update.

---

## Built-in mathematical presets

| Preset | Generator | Idea |
|---|---|---|
| Lissajous 3:5 | `lissajous` | a/b = 3/5 frequency ratio |
| Golden Rose | `polar` | Closed rose with k = 13/8, a Fibonacci approximation of φ |
| Superformula Star | `superformula` | Gielis with star m, n values |
| Superformula Flower | `superformula` | Gielis petal configuration |
| Fourier Capsule | `fourier` | closed shape from harmonic series |
| Fourier Butterfly | `fourier` | open shape from harmonic series |
| Lorenz / Clifford / De Jong / Aizawa | attractors | chaotic sample clouds |
| Helix (Isometric), Spiral Helix, Cone | `parametric-3d` | projected 3D curves |
| Torus | `parametric-surface` | closed U/V torus |
| Sphere | `parametric-surface` | azimuth × polar patch |
| Hyperbolic Saddle | `parametric-surface` | z = u² − v² |
| Wave Sheet | `parametric-surface` | orthogonal sine patch |
| Helicoid | `parametric-surface` | minimal screw surface |
| Catenoid | `parametric-surface` | minimal surface of revolution |
| Enneper Surface | `parametric-surface` | self-intersecting minimal surface |
| Möbius Band | `parametric-surface` | half-twisted strip welded across a reversed seam |
| Seashell | `parametric-surface` | logarithmic spiral tube |
| Vesica Prime (v1) | `bilateral-spline` | legacy v1 generator, preserved |
| Helix Lab | `helix` | Básica, Radio Variable, Paso Variable, Ondulada, Doble Hélice, Cónica |

The library is grouped into Curves, Patterns, Fourier, Attractors, 3D Curves,
Surfaces, Helix Lab and Legacy; user saves appear under My Presets. Every row
shows a deterministic preview derived from its document, and favorites and
recents persist as workspace metadata without changing the preset JSON.

---

## Development

### Tests

```bash
npm test
```

Runs `test/lab.smoke.mjs` — 1689 checks across 31 groups (expression
engine, noise determinism, splines, all 24 registered generators,
operators, document round-trip + dual-format read, built-in presets,
chained mutation across families, SVG export, animation, sampling,
performance budget, reliability regressions, offline and optional LLM
advisors, image contour tracing, evolution, helix projections, session recovery,
panel modes, parametric surfaces, preset library). The whole core is
DOM-free and runs in pure Node. `npm run test:e2e` runs the Playwright
suite (105 tests) against a Vite server started by Playwright itself.

### Linting

ESLint runs with a flat config (`eslint.config.js`). `npm run lint` checks
`src`, `test`, `e2e` and the config files; CI runs it before the unit suite.
`npm run check` runs lint, the Node suite and the production build.

### Build

```bash
npm run build      # writes dist/
npm run preview    # serves the build
```

Bundle: the eager shell is ~630 KB minified (~197 KB gzip), split into app,
CodeMirror, lil-gui and geometry-vendor chunks. p5 is lazy-loaded as a
separate chunk (~1.06 MB minified, ~270 KB gzip) after first paint.

---

## What ships in v0.1.0

- **24 generators** registered and tested (parametric, polar, custom,
  lissajous, rose, superformula, fourier, trochoids (hypo/epi/spirograph),
  harmonic-oscillator, noise-field, catmull-rom, bezier, cubic-spline,
  bilateral-spline, lorenz, clifford, dejong, aizawa, concentric-ellipses,
  parametric-3d, generalized helix, parametric-surface)
- **36 operators** across geometry (transform, symmetry, kaleidoscope,
  resample, offset, deform, project, stroke, boolean) and topology
  (radial/linear arrays, repeat, voronoi, skeleton, medial-axis,
  ribbons, centerline)
- **4 analysis overlays** (inflections, sample points, ruler, bbox)
- **14 render passes** (stroke, points, wireframe, control polygon,
  gradient wireframe, tangents, normals, curvature heatmap, negative space,
  signed distance, topology, epicycles)
- **Animation transport** with time-driven AnimatableValue expressions
- **Analysis panel** with deterministic descriptor metrics and parameter influence
- **Notebook** with checkpoints, thumbnails, lineage and A/B comparison
- **Explore** with Solo/Lock, seeded randomize and a 1D variation strip
- **Artboard & style** with palettes, stroke/fill controls, linear/radial fill gradients and SVG/PNG export with vector-pass fidelity
- **2D grid & morph** for two-axis families and smooth A→B transitions
- **Layers** with independent generators, operator stacks and styles
- **Perform** with Animation and Timeline: keyframes, easing, recording, loop, PNG ZIP, SVG frame ZIP and GIF export
- **Offline advisor** with deterministic A/B narration, suggestions, preview and apply
- **Optional LLM advisor** with fake/Ollama/OpenAI-compatible providers, grounded prompts, validation, cache and privacy disclosure
- **Ingest** with local image underlay, threshold preview, single/all-contour/hole tracing and editable Fourier layers
- **Evolution** with parent selection, numeric crossover, structural mutation and generation lineage
- **Helix Lab** with generalized radial/pitch modulation, torsion, orthographic views, a metric-aware gradient wireframe and a 2×2 quad view (3D + XY/XZ/YZ)
- **Clone ×3** quick action via the Grid Repeat operator (side-by-side copies remain editable)
- **CodeMirror formula editor** with math-aware highlighting and inline errors
- **Session recovery** with local autosave and an explicit Restore/Dismiss banner
- **Panel clarity** with Form/Look/Explore/Perform/Ingest/Keep modes, persisted accordions, essential/advanced parameters, per-layer render overrides, per-pass opacity, layer warnings and a Clone ×3 operator
- **Mutation v2** in parameter space with full-evaluation validation
- **Dual-format preset read** (`glyph-lab` v1/v2 + `parametrica` v0)
- **Undo/redo** (50 snapshots, coalesced slider gestures, ⌘/Ctrl+Z)
- **Export** SVG (vector passes + embedded document) · plotter SVG (stroke-only) · PNG · GIF (timeline) · JSON · clipboard

Deferred to v0.x:

- Custom palette editor
- Per-pass color and stroke-width settings
- Even-odd hole filling / contour nesting
- Quad SVG/plotter reconstruction (canvas-only today)
- MAKE/fabrication (solids, CSG, STL/3MF, 3D viewport)

---

## History

- **v1.0** — *Glyph Lab*: single bilateral-spline generator, mirrored,
  one master curve. Tagged `c26c340`.
- **v0.1.0** — *Parametrica*: rewritten as a parametric geometry
  workbench with pluggable generators/operators, expression engine,
  mutation v2, animation, full preset system. v1 presets migrate
  transparently.

The rename reflects what the engine actually became: not a logo tool,
but a way to discover mathematical families of continuous forms.

---

## License

Private / unreleased. © Hugo Moraga.
