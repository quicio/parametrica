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
npm test             # node-only verification suite (1152 checks)
npm run check        # lint + unit + production build
npm run test:e2e     # Playwright suite (57 tests, starts Vite automatically)
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
| **Generator** | Choose a mathematical model — parametric equations, polar, Fourier, superformula, lissajous, trochoids, spirograph, noise fields, harmonic oscillators, custom multi-line programs |
| **Parameters** | Schema-built panel that swaps when you change generator. Numbers, booleans, selects |
| **Equations** | Live text fields for `x(t)`, `y(t)`, `r(θ)`, or free-form `custom` programs. Errors surface inline |
| **Harmonics** | Interactive Fourier tables with add/remove/reorder rows |
| **Operators** | Stack of pure `Curve[] → Curve[]` stages — transform, symmetry, resample, offset, deform, project, stroke, boolean, repeat, voronoi. Reorder, toggle, add |
| **View** | Multiple render passes stack (curve, points, normals/tangents, curvature heatmap, epicycles, wireframe). Overlays: inflections, sample points, ruler, bbox |
| **Animation** | Every numeric parameter accepts `time` expressions (`3 + 0.5*sin(0.7*time)`). Play/pause/scrub/speed |
| **Mutation** | Perturbs parameters + numeric literals in equations. Always valid (re-rolled on failure) |
| **Presets** | Built-in mathematical families + user saves. Dual-format read: legacy v1 `glyph-lab` presets still load |
| **Export** | SVG (clean paths + embedded Parametrica document), PNG (HiDPI), JSON, clipboard |

---

## A 60-second tour

1. **Equations** — edit `x(t)` and `y(t)` in the Equations panel. The
   canvas updates as you type.
2. **Operators** — add `radial repeat (n=8)` from the Operators section.
   The form radiates symmetrically.
3. **Animation** — set a parameter to `{ expr: "3 + 2*sin(time)" }` via
   the modulator field (or use the `time` variable directly inside an
   equation). Press play.
4. **Mutation** — click *Mutate*. A new valid document appears in the
   same mathematical family.
5. **Export** — *Export SVG* writes a clean monoline file with the
   full document embedded as an XML comment.

---

## Architecture

```
generators/  (23 registered)  one file each, self-registered
operators/   (31 registered)  geometry/ + topology/, each Curve[] → Curve[]
math/               safe Pratt-parser expression engine + seeded simplex noise
sampling/           uniform + adaptive + arc-length resampling + bbox helpers
analysis/           differential geometry: tangents, normals, curvature, inflections
lab/                descriptor, hash, sensitivity, notebook, exploration and diffs
ai/                 deterministic offline narration and suggestion rules
render/             p5 surface, artboard/palettes, thumbnails, projections and 12 passes
viz/                toggleable diagnostic overlays
animation/          AnimatableValue + timeline resolution (keyframes/easing)
mutation/           parameter-space mutation with full evaluation validation
presets/            built-in library + JSON persistence in localStorage
export/             SVG (path-embedded document) · PNG · JSON · clipboard
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
| Golden Rose | `polar` | r = cos(k·θ) with k = φ-related integer |
| Superformula Star | `superformula` | Gielis with star m, n values |
| Superformula Flower | `superformula` | Gielis petal configuration |
| Fourier Capsule | `fourier` | closed shape from harmonic series |
| Fourier Butterfly | `fourier` | open shape from harmonic series |
| Vesica Prime (v1) | `bilateral-spline` | legacy v1 generator, preserved |
| Helix Lab | `helix` | Básica, Radio Variable, Paso Variable, Ondulada, Doble Hélice, Cónica |

---

## Development

### Tests

```bash
npm test
```

Runs `test/lab.smoke.mjs` — 1152 checks across 26 groups (expression
engine, noise determinism, splines, all 23 registered generators,
operators, document round-trip + dual-format read, built-in presets,
chained mutation across families, SVG export, animation, sampling,
performance budget, reliability regressions, offline and optional LLM
advisors, image contour tracing, evolution, helix projections, session recovery). The whole core is
DOM-free and runs in pure Node. `npm run test:e2e` runs the Playwright
suite (57 tests) against a Vite server started by Playwright itself.

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

- **23 generators** registered and tested (parametric, polar, custom,
  lissajous, rose, superformula, fourier, trochoids (hypo/epi/spirograph),
  harmonic-oscillator, noise-field, catmull-rom, bezier, cubic-spline,
  bilateral-spline, lorenz, clifford, dejong, aizawa, concentric-ellipses,
  parametric-3d, generalized helix)
- **31 operators** across geometry (transform, symmetry, resample,
  offset, deform, project, stroke, boolean) and topology (repeat,
  voronoi, skeleton, medial-axis, ribbons, centerline)
- **4 analysis overlays** (inflections, sample points, ruler, bbox)
- **12 render passes** (stroke, points, wireframe, control polygon,
  gradient wireframe, tangents, normals, curvature heatmap, negative space,
  signed distance, topology, epicycles)
- **Animation transport** with time-driven AnimatableValue expressions
- **Analysis panel** with deterministic descriptor metrics and parameter influence
- **Notebook** with checkpoints, thumbnails, lineage and A/B comparison
- **Explore** with Solo/Lock, seeded randomize and a 1D variation strip
- **Artboard & style** with palettes, stroke/fill controls and faithful SVG/PNG export
- **2D grid & morph** for two-axis families and smooth A→B transitions
- **Layers** with independent generators, operator stacks and styles
- **Timeline** with keyframes, easing, recording, loop and ZIP frame export
- **Offline advisor** with deterministic A/B narration, suggestions, preview and apply
- **Optional LLM advisor** with fake/Ollama/OpenAI-compatible providers, grounded prompts, validation, cache and privacy disclosure
- **Image input** with local underlay, threshold preview, largest-contour tracing and editable Fourier documents
- **Evolution** with parent selection, numeric crossover, structural mutation and generation lineage
- **Helix Lab** with generalized radial/pitch modulation, torsion, orthographic views and a height-gradient wireframe
- **CodeMirror formula editor** with math-aware highlighting and inline errors
- **Session recovery** with local autosave and an explicit Restore/Dismiss banner
- **Mutation v2** in parameter space with full-evaluation validation
- **Dual-format preset read** (`glyph-lab` v1/v2 + `parametrica` v0)
- **Undo/redo** (50 snapshots, coalesced slider gestures, ⌘/Ctrl+Z)
- **Export** SVG (embedded document) · PNG · JSON · clipboard

Deferred to v0.x:

- Color-by-metric palette system
- Plotter-ready SVG with line tests
- Helix multi-viewport layout (3D + three projections at once)
- Custom gradient-ramp editor
- Multi-contour / hole-aware image tracing

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
