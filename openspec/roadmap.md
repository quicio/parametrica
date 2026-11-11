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
| Surface inspection: world ray picking, UV/XYZ readout and occlusion | shipped (2026-11-03) |
| Surface inspection audit: composition/Quad/tolerance/lifecycle fixes | shipped (2026-11-03) |
| Surface inspection visuals: marker, triangle/cell overlays and pin | shipped (2026-11-03) |
| Surface seam overlay: borders, declared seams and reverse/twist styles | shipped (2026-11-03) |
| Surface inspection integration review + reference extent fix | shipped (2026-11-03) |
| Helix quad view: 3D + XY/XZ/YZ canvases | shipped (2026-11-02) |
| Gradient color metrics: auto/height/radius/curvature/arc | shipped (2026-11-02) |
| Composition preview: 224 px Start With previews and size-aware cache | shipped (2026-11-04) |
| UI maintainability: inspector sections, p5 overlays and domain test modules | shipped (2026-11-04) |
| Instance performance: 24-instance benchmark and smoke guardrail | shipped (2026-11-04) |
| Spec purpose pass: all archived purposes specified and gated | shipped (2026-11-04) |
| Custom user Looks: local view-level presets | shipped (2026-11-04) |
| Per-pass appearance: optional color/width overrides | shipped (2026-11-04) |
| Coordinate readout polish: 3D surface hits and pinned readout | shipped (2026-11-04) |

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
| `image-evenodd` | Even-odd hole filling and contour nesting |
| `quad-svg-export` | Quad layout reconstruction in SVG/plotter |
| `solid-foundations` | Remaining Phase 5: self-intersection, CSG, repair and multi-body |
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

### Phase 6 — Robustness and interchange (specified, not implemented)

| Change | Scope |
|---|---|
| `self-intersection-repair` | Remesh self-intersecting closed meshes |
| `mesh-topology-repair` | Non-manifold edge splitting and non-orientable handling |
| `3mf-export` | Deterministic multi-body 3MF with units and object identity |
| `csg-robustness` | Robust CSG for non-convex overlapping solids |

All four are implemented, validated and shipped.

### Phase 7 — Robust geometry kernel (shipped)

`robust-geometry-kernel` adds exact orientation fallbacks, adaptive tolerance,
snap rounding and triangle-intersection primitives. `adaptive-remesh` adds
feature-edge detection and projection for better fallback fidelity.

### Phase 8 — Manifold CSG engine (shipped)

`manifold-engine` integrates Manifold WASM as the primary robust CSG engine,
with lazy initialization, validation and BSP/remesh fallbacks.

### Phase 9 — SDF self-intersection repair (shipped)

`sdf-intersection-repair` uses a winding-sign SDF and Manifold.levelSet to
repair self-intersecting meshes, with remesh as fallback.

### Phase 10 — Fabrication worker (shipped)

`fabrication-worker` moves heavy repair/CSG/SDF jobs to a cancellable Web Worker
with progress, result caching and a synchronous fallback.

### Phase 11 — Fabricate workflow (shipped)

`fabricate-workflow` groups Fabricate into Source/Repair/Combine/Output/Checks,
adds a plan summary, quality presets, suggested resolution and a next action.

### Phase 12 — Fabricate example presets (shipped)

`fabricate-presets` adds a curated Fabricate category: ready solid, multi-body,
boolean union/difference, cap repair, SDF repair and a non-orientable challenge.

### Phase 13 — Hollow vase example (shipped)

`vase-200-preset` adds a 200 mm hollow vase with a 2.5 mm solid wall, built from
outer/inner surfaces and Manifold difference.

### Phase 14 — Upright vase presentation (shipped)

`vase-upright-presentation` starts the vase preset on the far side of the XY
plane so +Y reads as up, and locks the upright, circular presentation with
tests.

### Phase 15 — Orbit camera (shipped)

`orbit-camera` replaces the fixed-pivot 3D projection with a full-sphere orbit
around +Z, so yaw moves around the figure and pitch can inspect the top and
bottom. The vase returns to Z-up, ready for the slicer.

### Phase 16 — Surface lattice (shipped)

`surface-lattice` adds a deterministic Voronoi strut network on a surface of
revolution, a Manifold tube solid with floor and rim, and the `Lattice Vase 200`
example.

### Phase 17 — Lattice solid preview (shipped)

`lattice-solid-preview` mirrors the prepared lattice body into the canvas with
a persisted Network/Solid toggle, display simplification and a batched preview
pass.

### Phase 18 — Lattice and print polish (shipped)

`lattice-print-polish` adds area-uniform cells, rounded joints, the
`Perforated Vase 200` cutout example and overhang/bed/feature checks in every
Fabricate report.

### Phase 19 — Lattice refinement (specified, not implemented)

**Change:** `2026-11-06-lattice-refinement`

Turns the fixed-resolution organic lattice into a measured adaptive result:
surface-coordinate subdivision, chord/surface deviation, topology-preserving
refinement, capsule opening validation, quality budgets and 15/20/25 mm
benchmarks. The local SDF joint remains a benchmark candidate; `rounded`
stays the production fallback until the decision gate passes.

Depends on `lattice-cell-contracts` and `organic-struts`.

### Phase 20 — Manufacturing profile (specified, not implemented)

**Change:** `2026-11-06-manufacturing-profile`

Adds a serializable manufacturing profile and an evidence-based report:
process minima, overhang, bed, opening, strut/joint and envelope checks with
`measured` / `declared` / `estimated` / `unavailable` sources. Geometry
validity and units remain hard export blocks; manufacturing warnings are
non-blocking by default and `block` mode is explicit.

Depends on the fabrication contracts, the lattice stats and the refinement
gauge. It does not add a slicer or support generation.

### Baseline integrity slice (specified, not implemented)

**Change:** `2026-11-06-export-integrity`

Closes two residual audit gaps before manufacturing claims are layered on
top: 3MF must triangulate polygonal faces instead of writing only
`face[0..2]`, and `manifoldGuaranteed` must not survive a topology-changing
post-process. This is a small prerequisite, not a new geometric feature.

### Phase 21 — Product preview (implemented first slice; AO/benchmarks pending)

**Change:** `2026-11-06-fabrication-preview`

Adds an optional WebGL/PBR backend behind `RenderScene` for judging the prepared
fabrication body with material, directional light, shadows and optional AO.
p5 remains the technical default and the canonical path for overlays,
inspection, SVG/plotter and existing exports. The backend and its dependency are
lazy-loaded; WebGL failure falls back to p5.

This is the high-cost, high-value slice chosen after the technical preview
proved insufficient for evaluating an organic, fabricable sculpture.

### Lattice program status

| Change | Scope | Status |
|---|---|---|
| `2026-11-06-lattice-cell-contracts` | Phase 1: spec, network, distribution, openings | archived (2026-11-08) |
| `2026-11-06-organic-struts` | Phase 2: curves, radius, joints, envelope, finish | archived (2026-11-08) |
| `2026-11-06-export-integrity` | 3MF triangles + trust lifecycle | archived (2026-11-08) |
| `2026-11-06-lattice-refinement` | Phase 3: adaptive refinement, gauge, budgets | archived (2026-11-08) |
| `2026-11-06-manufacturing-profile` | Phase 5: profile and evidence report | archived (2026-11-08) |
| `2026-11-06-fabrication-preview` | Phase 4: optional WebGL/PBR product preview | archived (2026-11-08) |
| `2026-11-06-product-render-export` | Phase 4 follow-up: Product PNG export | archived (2026-11-08) |

Appearance/PBR is now **implemented**, not deferred. It remains independent of
the geometry pipeline and ships behind an explicit Technical/Product toggle, with
p5 as the technical default. SSAO, material/light controls, the software-WebGL
benchmark and a Product PNG export are in place. A hardware-GPU benchmark and a
stable CI screenshot policy remain pending.

The refinement core is now **implemented and archived**: adaptive chord sampling,
surface deviation, capsule-sampled opening checks, refinement provenance,
15/20/25 benchmark, visual goldens and the local SDF joint decision. `blend` is
an explicit budgeted SDF option; `rounded` remains the default.

The manufacturing profile is now **implemented** as an evidence report:
serializable FDM/Resin/Custom minima, measured/declared/estimated/unavailable
labels, warn-by-default gating, opt-in block mode and a Fabricate check table.
Wall thickness remains correctly `unavailable` until a real estimator exists;
external slicer verification remains a manual record.

### Fabricate boolean groups and wave 3 (archived)

Independent boolean groups now let one preset export several hollow bodies.
This unlocked the three-shade `Lampshade Ring Set` and the multi-body grouped
recipe. `Stackable Tray 160` adds a stepped lip without a second boolean.

### Fabricate object primitives and wave 2 (archived)

Rounded superellipse shells, cutter layers, open annular shells and stepped
solids unlocked seven new functional/decorative objects. Product preview now
works for any prepared solid, not only lattice bodies.

### Fabricate library review (archived)

The Fabricate category now contains only exportable solids: functional objects,
decorative/abstract pieces and technical torus/boolean examples. SDF Enneper and
Möbius Challenge were removed.

### Post-lattice backlog (archived)

The lattice program is archived. The post-lattice slices are implemented,
verified and archived:

| Change | Scope | Status |
|---|---|---|
| `2026-11-08-ui-hardening` | 200% zoom, responsive, keyboard, reduced motion | archived |
| `2026-11-08-preview-performance` | PBR benchmarks, lazy guard, visual evidence | archived |
| `2026-11-08-surface-performance` | dense picking/seams/playback benchmark | archived |
| `2026-11-08-image-evenodd` | even-odd fill and contour nesting | archived |
| `2026-11-08-quad-svg-export` | Quad layout in SVG/plotter | archived |
| `2026-11-08-persistence-consolidation` | session/notebook/preset storage model | archived |

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
| `surface-inspection` | archived | shipped |
| `surface-inspection-audit` | archived | shipped |
| `surface-inspection-visual` | archived | shipped |
| `surface-seams` | archived | shipped |
| `surface-inspection-integration` | archived | shipped |
| `surface-workbench` | archived | shipped |
| `physical-units` | archived | shipped |
| `fabrication-export` | archived | shipped |
| `make-mvp` | archived | shipped |
| `viewport-coordinates` | archived | shipped |
| `look-presets` | archived | shipped |
| `startup-continuity` | archived | shipped |
| `instance-layers` | archived | shipped |
| `vortex-stack-preset` | archived | shipped |
| `start-with` | archived | shipped |
| `default-stroke-05` | archived | shipped |
| `remediation-hardening` | archived | shipped |
| `composition-preview` | archived | shipped |
| `ui-maintainability` | archived | shipped |
| `instance-performance` | archived | shipped |
| `spec-purpose-pass` | archived | shipped |
| `custom-look-presets` | archived | shipped |
| `pass-appearance` | archived | shipped |
| `coordinate-readout-polish` | archived | shipped |
| `solid-preparation` | archived | shipped |
| `self-intersection` | archived | shipped |
| `multi-body` | archived | shipped |
| `solid-booleans` | archived | shipped |
| `advanced-repair` | archived | shipped |
| `robust-geometry-kernel` | archived | shipped |
| `adaptive-remesh` | archived | shipped |
| `manifold-engine` | archived | shipped |
| `sdf-intersection-repair` | archived | shipped |
| `fabrication-worker` | archived | shipped |
| `fabricate-workflow` | archived | shipped |
| `fabricate-presets` | archived | shipped |
| `vase-200-preset` | archived | shipped |
| `vase-upright-presentation` | archived | shipped |
| `orbit-camera` | archived | shipped |
| `surface-lattice` | archived | shipped |
| `lattice-solid-preview` | archived | shipped |
| `lattice-print-polish` | archived | shipped |
| `self-intersection-repair` | archived | shipped |
| `mesh-topology-repair` | archived | shipped |
| `3mf-export` | archived | shipped |
| `csg-robustness` | archived | shipped |

A “specified” change has complete proposal/spec/design/tasks artifacts and
passes `openspec validate`; implementation has not started.

## 5.2 Post-3F track — Surface Workbench & Fabrication (Fases 4A–4D, shipped)

The four Phase 4 slices were implemented in order, validated with `npm run check`, `npm run test:e2e` and strict OpenSpec validation, and archived. See `docs/phase-4-surface-fabrication.md` for semantics and limits.

| Order | Change | Scope | Depends on |
|---|---|---|---|
| 4A | `2026-11-03-surface-workbench` | World operators that accept Surface/Mesh, multiple surfaces, mapping lifecycle | Existing surface pipeline |
| 4B | `2026-11-03-physical-units` | Explicit world/artboard units and scale; no geometry mutation | 4A optional, useful before export |
| 4C | `2026-11-03-fabrication-export` | Binary STL for validated watertight Mesh/Solid | 4B |
| 4D | `2026-11-03-make-mvp` | Read-only Fabricate mode: health, units, STL export | 4B, 4C |

Rules:

- 4D depends on the physical-unit and STL pipelines from 4B and 4C.
- 4D remains read-only: no CSG, caps, repair or multi-body.
- 4A shipped first because fabrication needs forms worth making.
- The MAKE-first exception (4B → 4C → 4D → 4A) was not needed; all four are
  now shipped.

### 4E — Viewport coordinates (shipped)

`2026-11-03-viewport-coordinates` shipped. Look now has a Coordinates section
and a pure descriptor for XY/XZ/YZ panels: axis signs, origin, ticks,
unit-aware values and cursor readout. It is UI-only, excludes exports and adds
only optional `view.coordinates` metadata. See `docs/viewport-coordinates.md`.

### 4F — Look presets and control clarity (shipped)

`2026-11-03-look-presets` shipped. Look has named visual presets and a clearer
render contract: checkbox enables a pass, opacity adjusts strength, and
unavailable controls explain why. See `docs/look-presets.md`.

### 4G — Startup continuity (shipped)

`2026-11-03-startup-continuity` shipped. The app restores the last valid session
document, generator, params, operators and view automatically on startup. New
documents use stroke width 1. See `docs/startup-continuity.md`.

### 4H — Instance Layers (shipped)

`2026-11-04-instance-layers` shipped. Generator layers can be referenced by
instance layers with shared parameters, per-instance transforms, deterministic
identity, regenerated SurfaceMapping and source-aware inspection. Limits: 24
instances / 32 layers. Mirror and multi-body export remain out. See
`docs/phase-4h-instance-layers-design.md`.

### 4I — Vortex Stack preset (shipped)

`2026-11-04-vortex-stack-preset` shipped. The preset library includes **Vortex
Stack** under **Compositions**, with stable composition previews and
source-generator badges. See `docs/phase-4h-instance-layers-design.md`.

### 4J — Start With and thin default stroke (shipped)

`2026-11-04-start-with` and `2026-11-04-default-stroke-05` shipped. Fresh
sessions choose Composition, Parametric or Parametric Surface; valid sessions
still restore automatically. New documents use stroke width 0.5.

### 4K — Remediation hardening (shipped)

`2026-11-04-remediation-hardening` shipped. Layer/instance IDs are
document-scoped, Surface IDs are deterministic, manual New Document asks before
replacement, the e2e session fixture is generated, the advisor is instance-safe
and current docs match the gates.

### 4L — Post-audit polish (shipped)

Seven bounded changes were implemented, validated and archived:

| Change | Status | Scope |
|---|---|---|
| `composition-preview` | shipped | 224 px Start With previews and size-aware cache |
| `ui-maintainability` | shipped | Split Controls/P5 overlays/Node suite without behavior change |
| `instance-performance` | shipped | 24-instance browser benchmark and budgets |
| `spec-purpose-pass` | shipped | Replace 24 TBD spec purposes and add a placeholder gate |
| `custom-look-presets` | shipped | User-authored view-level Looks |
| `pass-appearance` | shipped | Per-pass color and stroke width |
| `coordinate-readout-polish` | shipped | Pinned readout and 3D surface-hit coordinates |

Phase 5 remains a separate future program and is intentionally not specified in
this batch.

### Phase 5 — Solid foundations (in progress)

Phase 5 is split into bounded slices. **5A is shipped**; the rest remain future
work and require their own OpenSpec changes.

| Slice | Scope | Status |
|---|---|---|
| 5A `solid-preparation` | Explicit weld, boundary loops, caps, merge and derived fabrication source | shipped (2026-11-05) |
| 5B `self-intersection` | Triangle intersection diagnostics and validation reporting | shipped (2026-11-05) |
| 5C `multi-body` | Explicit active-layer/composition scope and multi-shell STL export | shipped (2026-11-05) |
| 5D `solid-booleans` | Union/difference/intersection (CSG) on validated solids | shipped (2026-11-05) |
| 5E `advanced-repair` | Orientation fixes, non-planar hole strategies, repair reports | shipped (2026-11-05) |

---

## 5.3 Later exploration backlog

Smaller independent slices remain candidates for parallel work:

- `image-evenodd` (hole fill/nesting);
- `quad-svg-export` (Quad reconstruction in SVG/plotter);
- browser benchmark of dense surface picking/seams and playback;
- unified notebook/presets persistence decision.


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

### Release versioning

- Every archived change is a release boundary.
- `package.json` is authoritative; `CHANGELOG.md` and the `vX.Y.Z` tag must match.
- `npm run check:version` enforces the changelog/package match.
- See `openspec/decisions/0001-code-versioning.md`.

### Design authority

- `PRODUCT.md` holds product truth; `DESIGN.md` holds the visual system.
- UI/UX changes run through the Impeccable skill before editing.
- `openspec/decisions/0002-design-decisions-impeccable.md` is the policy.

### Delivery workflow

- One vertical slice = one OpenSpec change.
- Validate before coding; tests before archive; gates before release.
- Archive is the acceptance act; ADR-0003 is the policy.

### Architecture modernization (proposed)

| Phase | Scope | Status |
|---|---|---|
| 0 | `tsconfig`, `tsx`, `typecheck` and declaration foundation | done (0.2.3) |
| A | Extract domain boundaries and ports without behavior change | done through 0.2.12 |
| B | Split composition root and adapters; thin UI | done through 0.2.12 |
| C | Convert domain, then application, then adapters to TypeScript | ...ports/input/entry (0.2.40); generators/operators/geometry/UI next |
| D | Empty dependency baseline; `allowJs: false`; strict gates | proposed |

ADRs: `0004-clean-architecture-boundaries.md`, `0005-incremental-typescript.md`,
`0006-architecture-type-gates.md`.

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
