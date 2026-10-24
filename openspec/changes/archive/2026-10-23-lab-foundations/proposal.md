## Why

Parametrica's engine is capable, but exploration is still serial: one canvas,
one parameter change at a time, no memory of discoveries, no deterministic
description of what changed, and no artistic composition beyond a single
monoline figure. The roadmap (`openspec/roadmap.md`) defines five new
experience modes — Explore, Observe, Notebook, Compose and Ask (AI) — that
require shared contracts before implementation.

Without foundational specs, each vertical slice would invent its own
descriptor shape, checkpoint format, parameter-selection semantics, layer
model and AI payload. Those are expensive to change later and would leak into
every slice. This change establishes the contracts only; no production
behaviour is implemented here.

Why now: the reliability hardening pass is complete and validated. The code
base is stable enough to define the next product layer without fighting
existing bugs.

## What Changes

- Add a versioned **figure descriptor** contract: deterministic metrics,
  parameter sensitivity, evolution diffs and stable analysis events.
- Add a **lab notebook** contract: checkpoints, thumbnails, lineage, A/B
  comparison, tags/notes and persistence/export.
- Add an **exploration session** contract: parameter selection, Solo/Lock,
  directed randomisation, 1D/2D sweeps, morphing and candidate adoption.
- Add a **composition model** contract: document v3 with layers, per-layer
  style, shared artboard, render order, v2 migration and faithful export.
- Add an **AI advisor** contract: descriptor-grounded prompts, structured
  suggestions, schema/range validation, provider abstraction, privacy and
  evaluation rules.
- No generators, operators, UI or document version are implemented in this
  change. The documents are normative for subsequent vertical slices.

## Capabilities

### New Capabilities

- `figure-observation`: deterministic descriptor, metric definitions,
  parameter sensitivity, stable evaluation events and A/B evolution diff.
- `lab-notebook`: checkpoint schema, thumbnail lifecycle, lineage, compare
  view, notes/tags and persistence/export format.
- `exploration-session`: selection and locking, directed randomisation,
  1D/2D sweep contracts, morph semantics and candidate adoption.
- `composition-model`: document v3 layers, per-layer style, artboard,
  render/export order, migration and multi-layer descriptor aggregation.
- `ai-advisor`: grounded analysis input, suggestion schema, validation,
  provider adapter, privacy, caching and offline/LLM evaluation.

### Modified Capabilities

- None. Existing behaviour is unchanged; the reliability-hardening specs
  remain the current baseline.

## Impact

- Future code: `src/analysis/`, `src/lab/` (new), `src/core/document.js`,
  `src/core/engine.js`, `src/render/`, `src/export/`, `src/ui/`, `src/ai/`.
- Future document schema: v3 with `layers[]`; v2 migrates to a single layer.
- Future dependencies: possibly none for observation/notebook/exploration;
  an optional AI provider adapter (no required network dependency).
- Tests: new unit fixture groups for descriptors/diffs/schemas, golden
  geometry/SVG snapshots, and e2e suites per vertical slice.
- No change to the current public document version, presets or UI.

## Non-goals

- No implementation of layers, notebook UI, sweeps, AI calls or image input.
- No cloud accounts, collaboration, telemetry or backend.
- No automatic aesthetic fitness function.
- No multi-contour image tracing in the first image slice.
- No new render pass or generator in this change.
- No change to SPEC.md milestone status beyond linking the roadmap.
