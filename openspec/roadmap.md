# Parametrica Lab Roadmap

Status: living document
Created: 2026-10-23
Owner: Hugo Moraga
Source of truth for scope: this roadmap + `openspec/specs/`
OpenSpec schema: `spec-driven`

---

## 1. North star

Parametrica is an **instrument for discovering forms**, not a drawing tool.

The target experience is:

> Move a few meaningful controls, see several possible forms, recognise the
> one that matters, understand why it appeared, keep it, compare it and build
> on it — without leaving the mathematical space that produced it.

The artist and the mathematician are the same user here. A form should be
beautiful, but also explainable, reproducible and evolvable.

### Success statement

A user can go from a generic starting form to a **named, comparable,
reproducible variation** in under five minutes, and can explain which
parameters and operators produced the change.

---

## 2. Product principles

1. **The form is a document, not a drawing.** Everything remains serialisable
   as generator + operators + parameters + view.
2. **Observation precedes automation.** We measure the figure before asking an
   LLM to talk about it.
3. **Every discovery is reproducible.** Any displayed form can be saved as a
   checkpoint with its document and descriptor.
4. **The form remembers its history.** Checkpoints have lineage: parent,
   parameter diff, descriptor diff and optional notes.
5. **AI narrates; mathematics computes.** Deterministic local analysis is the
   source of truth. The LLM explains and suggests, never invents geometry.
6. **One control, one consequence.** A slider or suggestion must be traceable
   to a visible change and a descriptor delta.
7. **Artistic output is a first-class requirement.** Style, canvas and export
   fidelity are not post-processing afterthoughts.
8. **No dead ends.** Every exploration surface has a path to compare, keep,
   export or discard.
9. **Thin vertical slices.** Each milestone is demoable, tested end-to-end and
   leaves the app in a usable state.
10. **Backward compatibility.** Existing documents and presets keep loading;
    schema changes ship with migrations.

---

## 3. Experience modes

The current single panel becomes five complementary modes. They can share one
shell, but each has a clear job.

### Explore

Move parameters with intent: solo/lock, directed randomisation, 1D strips,
2D variation grids, morphing and evolution.

### Observe

See deterministic metrics for the current figure: symmetry, curvature
entropy, crossings, spectral energy, complexity, coverage, parameter
influence.

### Notebook

Keep discoveries: checkpoint thumbnails, names, tags, notes, A/B comparison,
lineage and persistence/export.

### Compose

Build a piece: layers, multiple generators, per-layer style, artboard,
background, palette and faithful export.

### Perform

Animate: keyframes, modulators, recorded gestures, loop, frame-sequence
export and eventually live macro controls.

### Ask (AI)

A grounded copilot: explain the current form, explain the evolution from A to
B, suggest next experiments, preview/apply suggestions with validation.

### Ingest

Bring outside material in: image underlay for reference, then contour
extraction and conversion to a Fourier document.

---

## 4. Capability map

### Already shipped

| Capability | State |
|---|---|
| 24 generators / 36 operators / 14 render passes | shipped |
| Expression engine, adaptive sampling, seeded noise | shipped |
| Single document = generator + operator stack | shipped |
| Mutation, presets, SVG/PNG/JSON export | shipped |
| Preset library: previews, favorites, recents, grouped search | shipped (2026-11-01) |
| Undo/redo, seed control, visible notices | shipped |
| Lazy analysis, per-stage budgets | shipped |
| Node test suite + Playwright e2e + CI | shipped |
| Lab observer: descriptor + metrics + sensitivity + parameter docs | shipped (2026-10-23) |
| Lab notebook: checkpoints, thumbnails, lineage, A/B compare | shipped (2026-10-23) |
| Explore 1D: Solo/Lock, seeded randomize, variation strip | shipped (2026-10-23) |
| Artboard & style: presets, palettes, stroke/fill, export | shipped (2026-10-24) |
| Grid 2D + same-structure morph | shipped (2026-10-24) |
| Composition layers: v3, per-layer style, multi-layer export | shipped (2026-10-24) |
| Motion timeline: keyframes, easing, recording, ZIP frames + GIF | shipped (2026-10-24, GIF 2026-11-02) |
| Offline advisor: narration, rules, preview/apply | shipped (2026-10-24) |
| Optional LLM advisor: providers, prompts, validation, cache, privacy | shipped (2026-10-24) |
| Image input: underlay, contour extraction, Fourier tracing | shipped (2026-10-24) |
| Evolution: parent selection, crossover, structural mutation, lineage | shipped (2026-10-24) |
| Helix Lab: generalized helix, orthographic views, gradient wireframe | shipped (2026-10-24) |
| Technical debt: ESLint, CodeMirror, lazy p5, session recovery | shipped (2026-10-24) |
| UI clarity: workspace modes, accordions, progressive params, status | shipped (2026-10-24) |
| Product hardening + audit batch 1 | shipped (2026-11-02) |
| LOOK Phase 1: Camera/Canvas/Style/Render/Overlays | shipped (2026-11-02) |
| LOOK Phase 2: Ingest + Perform, Work group removed | shipped (2026-11-02) |
| Camera near-plane/scene-distance guards | shipped (2026-11-02) |
| Timeline GIF export | shipped (2026-11-02) |
| SVG vector pass fidelity: gradients, surfaces, diagnostics, overlays, blend | shipped (2026-11-02) |
| Fill gradients: linear/radial, direction, center, radius and stops | shipped (2026-11-02) |
| SVG frame sequence ZIP + manifest | shipped (2026-11-02) |
| Plotter-ready stroke-only SVG | shipped (2026-11-02) |
| Image tracing: all connected contours into Fourier layers | shipped (2026-11-02) |
| Internal hole contours in all-contours tracing | shipped (2026-11-02) |
| Per-layer render modes, pass opacity, color metrics and custom palettes | shipped (2026-11-02) |
| Parametric edge overlay for active-shape properties | shipped (2026-11-02) |
| Explicit P/W/A coordinate contracts and shared ViewTransform | shipped (2026-11-02) |
| Spatial reference: world origin, XYZ axes, labels and optional ground | shipped (2026-11-03) |
| UV Domain inset: real U/V bounds, low-density grid, orientation and seams | shipped (2026-11-03) |
| SurfaceMapping sidecar: per-cell triangles and real per-corner UVs | shipped (2026-11-03) |
| Projection source: world identity and orthographic depth sidecar | shipped (2026-11-03) |
| Helix quad view: 3D + XY/XZ/YZ canvases | shipped (2026-11-02) |
| Gradient color metrics: auto/height/radius/curvature/arc | shipped (2026-11-02) |

### Foundation contracts (this phase)

| Capability | Purpose |
|---|---|
| `figure-observation` | Descriptors, metrics, sensitivity, evolution diff |
| `lab-notebook` | Checkpoints, thumbnails, lineage, A/B, persistence |
| `exploration-session` | Selection, locks, sweeps, morph, directed mutation |
| `composition-model` | Document v3: layers, style, artboard, migration |
| `ai-advisor` | Grounded suggestions, provider adapter, privacy, evaluation |

### Later capabilities

| Capability | Purpose |
|---|---|
| `pass-appearance` | Per-pass color and stroke-width settings |
| `image-evenodd` | Even-odd hole filling and contour nesting |
| `quad-svg-export` | Quad layout reconstruction in SVG/plotter |
| `make-fabrication` | Solids, CSG, STL/3MF, units and print preparation |
| `instrument-ui-kit` | Optional: extract the domain-agnostic panel shell for sibling apps |
| `synth-sibling` | Optional: Web Audio synthesizer built on the shared UI kit |

### Optional future direction — reusable instrument UI

**Status:** idea only. Not scheduled, no OpenSpec change, no commitment.

A sibling instrument (for example a synthesizer that creates and visualises
waves) could reuse the same Swiss-instrument shell without sharing the
geometry engine. The extraction would be staged:

1. `packages/ui`: design tokens, mode bar, accordions, status line,
   essential/advanced disclosure, CodeMirror host and notices.
2. `packages/lab-core`: history, session snapshots and preset storage with
   injected sanitizers/schemas.
3. A sibling repo consumes the packages with its own audio engine, patch
   schema, oscilloscope/spectrum visualisers and WAV export.

Parametrica remains the first consumer and keeps its geometry-specific
engine, generators, operators and widgets. The current single-app layout is
not moved into a monorepo until a second app actually exists.

**Risks:** splitting the mixed `style.css`, over-abstracting domain widgets,
and maintaining two consumers before the synth has a stable patch model.


---

## 5. Roadmap phases and vertical slices

Slices are ordered by dependency and user value. Each slice is a separate
OpenSpec change, demoable, and tested end-to-end.

### Phase 0 — Foundations (spec-only)

**Change:** `lab-foundations`

- Define the five capability contracts.
- Define descriptor, checkpoint, exploration-session, document v3 and AI
  suggestion schemas.
- Validate with OpenSpec and archive into `openspec/specs/`.
- No production code.

### Phase 1 — Lab core

#### Slice 1 — `lab-observer` ✅ shipped (2026-10-23)

**User story:** “I move something, and the app tells me what changed.”

- Surface parameter documentation from schema `doc` fields.
- Compute a deterministic figure descriptor.
- Panel with symmetry, crossings, curvature entropy, area, aspect, coverage.
- Parameter sensitivity: perturb each numeric parameter ±Δ and rank influence.
- No AI.

**Demo:** load a preset, move a slider, see metric deltas and the most
influential parameter.

**Tests:** descriptor unit fixtures; sensitivity determinism; e2e metrics
panel; performance budget. Shipped with `src/lab/` and `LabPanel`;
unit group 14 and `e2e/ui.spec.js`.

#### Slice 2 — `lab-notebook` ✅ shipped (2026-10-23)

**User story:** “I keep this form, compare it with the previous one, and
recover it later.”

- Checkpoint model: document, descriptor, thumbnail, timestamp, parentId,
  name, tags, notes.
- Save current form, pin, rename, tag.
- A/B compare with thumbnails + parameter diff + descriptor diff.
- Local persistence and JSON export/import.
- Lineage tree/list.

**Demo:** save three forms, compare A/B, reload the page, recover them.

**Tests:** schema/versioning, persistence round-trip, diff fixtures, e2e
save/compare/reload. Shipped with `src/lab/notebook.js`, `diff.js` and
`NotebookPanel`; unit group 15 and notebook e2e flows.

#### Slice 3 — `explore-1d` ✅ shipped (2026-10-23)

**User story:** “I choose one axis and see the whole family at once.”

- Parameter selection, Solo/Lock.
- Directed randomisation within selected parameters and ranges.
- 1D variation strip: N thumbnails across one parameter.
- Click a thumbnail to adopt that candidate.
- Reuse the thumbnail renderer from `lab-notebook`.

**Demo:** strip of 16 variations of `superformula.n1`; adopt one.

**Tests:** sweep generation deterministic, candidate adoption, e2e strip.
Shipped with `src/lab/exploration.js`, shared parameter refs,
plain-canvas thumbnails and `ExplorePanel`; unit group 16.

### Phase 2 — Artistic surface

#### Slice 4 — `artboard-style` ✅ shipped (2026-10-24)

**User story:** “This now looks like a piece, not a debug view.”

- Artboard: width, height, background, margin, crop.
- Style: stroke color, weight, opacity, cap/join, optional fill.
- Palette presets.
- Export SVG/PNG faithful to artboard and style.
- Per-layer style support prepared in the contract, single layer for now.

**Demo:** white-on-black and color-on-paper versions exported identically.

**Tests:** SVG snapshot with color/background, PNG dimensions, e2e style
round-trip. Shipped with document artboard/style, renderer letterboxing,
palettes and `Artboard` panel.

#### Slice 5 — `explore-2d-morph` ✅ shipped (2026-10-24)

**User story:** “I see two parameters as a map and morph between two forms.”

- 2D variation grid with axis labels.
- Adopt a cell.
- Morph A→B in parameter space over N steps.
- Save the sequence as a checkpoint or animation.
- Guard when stage topology is incompatible.

**Demo:** 6×6 grid of `samples` × `ringScale`, then morph between two cells.

**Tests:** grid determinism, interpolation endpoints, incompatible-topology
fallback, e2e. Shipped with `grid2D`, `morphDocuments` and the Grid/Morph
modes in `ExplorePanel`; unit group 18.

### Phase 3 — Composition

#### Slice 6 — `composition-layers` ✅ shipped (2026-10-24)

**User story:** “I can put several mathematical figures in one piece.”

- Document v3 with `layers[]`.
- Each layer: generator, operators, seed, style.
- Shared view + artboard.
- Render order, visibility, opacity, lock.
- v2 → v3 migration (single layer).
- Multi-layer descriptor and export.

**Demo:** three layers (attractor background, superformula figure, line
texture), exported as one SVG.

**Tests:** migration, engine aggregation, layer isolation, export, e2e.
Shipped with document v3, layer aliases, layer panel, per-layer render/export
and aggregate descriptors; unit group 19.

#### Slice 7 — `motion-timeline` ✅ shipped (2026-10-24)

**User story:** “I can compose a loop and export it.”

- Timeline with keyframes per numeric parameter.
- Easing curves and loop mode.
- Record a parameter gesture.
- Playback and frame-sequence export.
- Deterministic evaluation at any time.

**Demo:** 6-second loop exported as PNG sequence.

**Tests:** keyframe interpolation, determinism, frame export, e2e playback.
Shipped with `src/animation/timeline.js`, `TimelinePanel` and ZIP sequence
export; unit group 20.

### Phase 4 — AI

#### Slice 8 — `ai-offline` ✅ shipped (2026-10-24)

**User story:** “The app explains what changed and suggests grounded next
experiments without sending anything anywhere.”

- Descriptor diff + parameter diff + sensitivity.
- Rule-based explanation and suggestion generator.
- Suggestion schema with parameter path, current value, proposed value,
  rationale, expected effect.
- Preview/apply button; no auto-apply.
- Works fully offline.

**Demo:** A/B compare produces three deterministic suggestions; apply one
with preview.

**Tests:** golden descriptor/diff fixtures, suggestion schema, range
validation, e2e apply. Shipped with `src/ai/offline.js` and `AdvisorPanel`;
unit group 21.

#### Slice 9 — `ai-llm` ✅ shipped (2026-10-24)

**User story:** “A model turns the deterministic analysis into language and
richer suggestions.”

- Provider adapter: `fake`, `ollama`, `openai-compatible`.
- Prompt built from descriptor + diff + sensitivity + document summary.
- Structured JSON output validated against the suggestion schema.
- Cache by document hash + descriptor version.
- Debounced analysis on stable commits; never per animation frame.
- Privacy: no image unless explicitly enabled; no telemetry.
- Fake provider in CI; manual Ollama smoke optional.

**Demo:** analyze current form, compare two checkpoints, apply a suggestion.

**Tests:** prompt fixture, response validation, invalid-output rejection,
fake-provider e2e, no network in CI. Shipped with `src/ai/prompt.js`,
`provider.js`, `cache.js` and provider controls in `AdvisorPanel`; unit
group 22.

### Phase 5 — Ingest and evolution

#### Slice 10 — `image-input` ✅ shipped (2026-10-24)

**User story:** “I bring a silhouette, trace it and continue in the
mathematical space.”

- Underlay: upload, opacity, scale, position, rotate.
- Threshold preview.
- Largest closed contour extraction and simplification.
- Fourier descriptor conversion.
- Apply as `fourier` document with editable harmonics.
- Explicit limitation: high-contrast single closed contour first.

**Demo:** upload a ring silhouette, get an editable Fourier figure, adjust
harmonics.

**Tests:** synthetic square/circle reconstruction error, contour
simplification, e2e upload/apply. Shipped with `src/input/imageTrace.js`,
`ImagePanel` and renderer-only underlay; unit group 23.

#### Slice 11 — `evolution-lab` ✅ shipped (2026-10-24)

**User story:** “I select forms I like and breed the next generation.”

- Selection from notebook.
- Numeric crossover and mutation.
- Structural mutation: add/remove/reorder operators.
- Generation tracking in lineage.
- No automatic aesthetic fitness; the user is the fitness function.

**Demo:** select four checkpoints, generate ten children, keep two.

**Tests:** crossover validity, structural mutation sanitisation, lineage,
e2e generation. Shipped with `src/lab/evolution.js`, `EvolutionPanel` and
generation metadata in the notebook; unit group 24.

---

## 5.1 Specification status

| Slice | OpenSpec change | Status |
|---|---|---|
| `lab-observer` | archived | shipped |
| `lab-notebook` | archived | shipped |
| `explore-1d` | archived | shipped |
| `explore-focus-preservation` | archived | shipped |
| `artboard-style` | archived | shipped |
| `explore-2d-morph` | archived | shipped |
| `composition-layers` | archived | shipped |
| `motion-timeline` | archived | shipped |
| `ai-offline` | archived | shipped |
| `ai-llm` | archived | shipped |
| `image-input` | archived | shipped |
| `evolution-lab` | archived | shipped |
| `product-hardening` | archived | shipped |
| `audit-corrections-batch-1` | archived | shipped |
| `look-reorganization` (Phase 1) | archived | shipped |
| `look-phase-2` | archived | shipped |
| `gif-export` | archived | shipped |
| `svg-export-fidelity` | archived | shipped |
| `fill-gradients` | archived | shipped |
| `svg-frame-export` | archived | shipped |
| `plotter-export` | archived | shipped |
| `image-multicontour` | archived | shipped |
| `helix-multiview` | archived | shipped |
| `color-metrics` | archived | shipped |
| `image-holes` | archived | shipped |
| `layer-pass-controls` | archived | shipped |
| `layer-color-metrics` | archived | shipped |
| `custom-palettes` | archived | shipped |
| `parametric-overlay` | archived | shipped |
| `coordinate-contracts` | archived | shipped |
| `spatial-reference` | archived | shipped |
| `uv-domain` | archived | shipped |
| `surface-mapping` | archived | shipped |
| `projection-source` | archived | shipped |

A “specified” change has complete proposal/spec/design/tasks artifacts and
passes `openspec validate`; implementation has not started.

## 6. Dependency graph

```text
lab-foundations
  ├── lab-observer
  │     ├── lab-notebook
  │     │     ├── explore-1d
  │     │     ├── ai-offline
  │     │     └── evolution-lab
  │     └── ai-offline
  ├── artboard-style
  │     └── composition-layers
  │           ├── motion-timeline
  │           └── ai-llm
  └── image-input
```

Rules:

- `lab-observer` is the walking skeleton.
- `lab-notebook` needs descriptor + thumbnail rendering.
- `explore-1d` reuses the thumbnail renderer.
- `composition-layers` must land before multi-layer AI, timeline export and
  final art export.
- `ai-llm` must not start before `ai-offline`.
- `image-input` can proceed independently after `lab-foundations`.

---

## 7. Definition of Ready (per slice)

A slice can start only when:

- one user story and one demo are written;
- acceptance scenarios are in its OpenSpec spec;
- affected foundational specs are identified;
- data migrations and backward compatibility are described;
- the test plan includes unit, e2e and visual/perf checks;
- risky unknowns have a timeboxed spike or an ADR.

## 8. Definition of Done (per slice)

- `openspec validate <change>` passes.
- Core logic is DOM-free and Node-tested where possible.
- UI is connected and demoable.
- Unit tests cover contracts and edge cases.
- One e2e test covers the user flow.
- Golden geometry/SVG snapshot updated when output changes.
- Performance gate stays green.
- Docs updated: `README`, `SPEC`, architecture, roadmap.
- Feature flag removed or documented.
- Three-minute demo recorded or scripted.

---

## 9. Methodology

### OpenSpec as contract

- One vertical slice = one OpenSpec change.
- Foundational specs live in `openspec/specs/` after archive.
- Each slice adds deltas only for changed behaviour.
- No code without a validated spec.
- Archive a slice only when it is demoable and tested.

### Walking skeleton

`lab-observer` must deliver the thinnest end-to-end path:
evaluation → descriptor → UI → test → e2e. No mocks left behind.

### Spikes and ADRs

Timeboxed 1–2 day spikes for decisions that are expensive to reverse:

- document v3 and layer model;
- thumbnail rendering strategy;
- local LLM provider and CORS;
- contour extraction quality.

Output: a short ADR in `openspec/decisions/`, not production code.

### Feature flags

Experimental slices may ship behind flags:

- `ai`
- `layers`
- `image-trace`
- `timeline`

Flags default off until the slice is complete.

### AI evaluation harness

- Golden documents with expected descriptor/diff snapshots.
- Fake provider in CI.
- Schema validation for every suggestion.
- Prompt fixtures checked into the repo.
- No network in automated tests.
- Manual Ollama/cloud smoke tests documented but not CI-gated.

### No horizontal work

No “all data models first”, no “all UI later”. Each slice touches core,
persistence, UI and tests.

---

## 10. Quality gates

| Gate | Target |
|---|---|
| Geometry pipeline | < 16 ms for 20k points locally; < 50 ms CI |
| Analysis | lazy; diagnostics only |
| Determinism | same document + seed + time ⇒ identical geometry |
| Accessibility | focus-visible, labels, canvas role |
| Export | SVG/PNG match artboard and style |
| Document compatibility | old presets load after every schema change |
| AI | no network in CI; invalid suggestions rejected |
| Bundle | p5 remains the dominant chunk; no surprise dependencies |

---

## 11. Metrics of success

Qualitative:

- A new user discovers a form they want to keep in under five minutes.
- Every saved form has a story: what changed and why.
- AI suggestions feel like a collaborator, not a random quote.

Quantitative (local, no telemetry):

- time from load to first checkpoint;
- checkpoints per session;
- percentage of sessions using A/B compare;
- suggestions previewed vs applied;
- parameter coverage per generator;
- e2e flake rate.

---

## 12. Parking lot

Ideas kept out of the current phases:

- cloud accounts and shared galleries;
- collaborative editing;
- MIDI/OSC live performance;
- audio-reactive parameters;
- WebGL/volumetric rendering;
- plotter-specific pen optimisation;
- video export with audio;
- AI style transfer from reference images;
- natural-language document generation;
- mobile-specific layout beyond responsive panel;
- reusable instrument UI package and a synthesizer sibling project
  (tracked as an optional idea above, not a committed phase).

---

## 13. Open decisions

Tracked as ADRs before the relevant slice:

1. **Layer seed model:** seed per layer vs inherited document seed.
2. **Style fidelity:** how much of render passes/overlays enters SVG/PNG.
3. **Thumbnail strategy:** separate p5 graphics buffer vs canvas 2D.
4. **AI provider:** local-first only vs optional hosted proxy.
5. **Image trace:** single largest contour vs multi-contour in v1.
6. **Notebook storage:** localStorage only vs file-system API.

---

## 14. OpenSpec change naming

Suggested order:

```text
lab-foundations
lab-observer
lab-notebook
explore-1d
artboard-style
explore-2d-morph
composition-layers
motion-timeline
ai-offline
ai-llm
image-input
evolution-lab
```

Each change must reference the roadmap phase and the foundational specs it
implements.
