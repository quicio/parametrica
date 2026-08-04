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
npm test             # node-only verification suite (451 checks)
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
generators/  (14)   one file each, self-registered
operators/   (10)   geometry/ + topology/, each Curve[] → Curve[]
math/               safe Pratt-parser expression engine + seeded simplex noise
sampling/           uniform + adaptive + arc-length resampling + bbox helpers
analysis/           differential geometry: tangents, normals, curvature, inflections
render/passes/      composable p5 draw functions (stroke, vectors, fields, epicycles)
viz/                toggleable diagnostic overlays
animation/          AnimatableValue resolution (number | { expr })
mutation/           parameter-space mutation with full evaluation validation
presets/            built-in library + JSON persistence in localStorage
export/             SVG (path-embedded document) · PNG · JSON · clipboard
ui/                 instrument panel + custom widgets (expression field, harmonic editor, operator stack)
core/               App composition root · engine · registry · document · schema
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
  version: 2,
  name: 'Lissajous 3:5',
  seed: 1,
  generator: { id: 'lissajous', params: { a: 3, b: 5, delta: 1.5708, size: 340 }, mods: {} },
  operators: [],
  view: { modes: ['stroke'], overlays: {}, strokeWeight: 2, guides: true },
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

---

## Development

### Tests

```bash
npm test
```

Runs `test/lab.smoke.mjs` — 451 checks across 11 groups (expression
engine, noise determinism, splines, all 16 registered generators,
operators, document round-trip + dual-format read, built-in presets,
chained mutation across families, SVG export, animation, performance
budget). The whole core is DOM-free and runs in pure Node.

### Linting

No formal linter configured. Each `.js` and `.mjs` write auto-runs a
syntax check.

### Build

```bash
npm run build      # writes dist/
npm run preview    # serves the build
```

Bundle weight: ~1.2 MB minified, ~320 KB gzip. The bulk is `p5.js`. Lazy
loading and tree-shaking p5 is on the roadmap (see SPEC.md §20).

---

## What ships in v0.1.0

- **14 generators** registered and tested (parametric, polar, custom,
  lissajous, rose, superformula, fourier, trochoids, harmonic-oscillator,
  noise-field, catmull-rom, bezier, cubic-spline, bilateral-spline)
- **10 operators** (transform, symmetry, resample, offset, deform,
  project, stroke, boolean, repeat, voronoi)
- **4 analysis overlays** (inflections, sample points, ruler, bbox)
- **6 render passes** (stroke, points, wireframe, normals/tangents,
  curvature heatmap, epicycles)
- **Animation transport** with time-driven AnimatableValue expressions
- **Mutation v2** in parameter space with full-evaluation validation
- **Dual-format preset read** (`glyph-lab` v1/v2 + `parametrica` v0)
- **Export** SVG (embedded document) · PNG · JSON · clipboard

Deferred to v0.x:

- CodeMirror syntax highlighting in the formula editor
- Heavy topology ops (intersections, self-intersections, ribbon, centerline, skeleton)
- Frame-sequence export for animations
- p5 bundle splitting

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
