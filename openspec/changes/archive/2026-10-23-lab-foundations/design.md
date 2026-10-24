## Context

The roadmap (`openspec/roadmap.md`) introduces exploration, observation,
notebook, composition and AI modes. Each vertical slice must share the same
contracts or the product will accumulate incompatible notions of “figure”,
“change” and “saved form”.

This design defines those contracts without implementing them. It builds on
SPEC.md §4 (pipeline), §10 (differential analysis), §12 (animation), §13
(mutation), §14 (presets) and §17 (export).

## Goals / Non-Goals

**Goals**

- One deterministic descriptor that every observer/UI/AI feature consumes.
- One checkpoint format that can reproduce a form exactly.
- One exploration contract decoupled from UI widgets.
- One document v3 model that supports layers without blocking current work.
- One AI suggestion format that can be validated and applied safely.

**Non-Goals**

- Implementing the slice UIs or engines.
- Choosing a specific LLM, cloud provider or model.
- Multi-contour image tracing.
- Automatic aesthetic scoring.

## Decisions

### D1: Descriptor is derived, versioned and deterministic

`FigureDescriptor` version `1` is a plain JSON object derived from the
evaluated curves and the document. It contains no timestamps, images, random
values or DOM state.

```text
FigureDescriptor = {
  version: 1,
  documentHash: string,
  generator: { id, params, mods },
  operators: [{ id, enabled, params, mods }],
  layers?: [LayerDescriptor],
  curveCount: integer,
  pointCount: integer,
  closed: boolean,
  bbox: { minX, minY, maxX, maxY, width, height, aspect },
  area: number,
  perimeter: number,
  compactness: number,
  centroid: { x, y },
  symmetry: { folds: integer, score: number },
  curvature: { mean: number, p95: number, entropy: number },
  inflections: integer,
  selfIntersections: integer,
  crossings: integer,
  fourier: { topHarmonics: number[], spectralCentroid: number },
  complexity: { turningNumber: number, fractalDimension: number },
  coverage: number,
  topology: { components: integer, holes: integer }
}
```

Definitions:

- `area` is the absolute shoelace area of each closed curve, summed.
- `perimeter` is arc length including the closing segment for closed curves.
- `compactness = 4π·area / perimeter²`; for degenerate perimeter 0 it is 0.
- `symmetry.score ∈ [0,1]` compares the resampled curve with its best
  rotational/reflection transform, using normalised Chamfer distance.
- `curvature.entropy` is the Shannon entropy of a 32-bin histogram of
  absolute curvature, normalised by `log2(32)`.
- `coverage` is the fraction of bbox cells (default 64×64) touched by a
  sampled point.
- `fractalDimension` uses the box-counting estimate at scales
  `bbox.diagonal / {8, 16, 32, 64}`.
- `topology.holes` uses closed-curve containment; `components` counts
  disconnected curve groups.
- `documentHash` is SHA-256 of the canonical sanitised document JSON
  (stable key order). It is the cache key for notebook and AI.

#### Sensitivity

For each selected numeric parameter `p` with schema range `[min,max]`:

```text
delta = max(step, (max - min) · 0.02)
D+(p) = descriptor of document with p = clamp(p + delta)
D-(p) = descriptor of document with p = clamp(p - delta)
impact(p) = shapeDistance(D+(p), D-(p))
```

`shapeDistance` is the normalised Chamfer distance between arc-length
resampled curves (512 points), with `1.0` meaning “completely different”.
`impact` is sorted descending and reported with the signed metric changes.

### D2: Evaluation events are stable, not per frame

The observer emits a `FigureSnapshot` only when:

- the user commits a change and the evaluation has been stable for 300 ms, or
- a checkpoint is created, or
- the user explicitly requests analysis.

Animation frames do not emit snapshots by default. A future “sample
animation” mode may emit snapshots every N seconds, explicitly.

```text
FigureSnapshot = {
  id: string,
  timestamp: number,
  document: ParametricaDocument,
  descriptor: FigureDescriptor,
  errors: EvaluationError[]
}
```

The snapshot is immutable. The notebook and AI consume snapshots, not live
mutable documents.

### D3: Checkpoints are complete and reproducible

A `Checkpoint` stores the full document, not just parameters, because
operators and view state are part of the form.

```text
Checkpoint = {
  version: 1,
  id: string,
  name: string,
  createdAt: number,
  document: ParametricaDocument,
  descriptor: FigureDescriptor,
  thumbnail: string | null,
  parentId: string | null,
  tags: string[],
  notes: string
}
```

- `thumbnail` is a data URL (PNG, max 256×256, max 64 KB) and may be null.
- `parentId` forms a DAG; cycles are rejected.
- A checkpoint is valid only if `document` passes `sanitizeDocument` and
  evaluates without errors.
- The thumbnail is a cache, never the source of truth.

### D4: Exploration sessions are ephemeral and non-destructive

An exploration session operates on candidates. It never mutates the current
document until the user adopts a candidate.

```text
ExplorationSession = {
  baseDocument: ParametricaDocument,
  selection: ParameterRef[],
  locks: ParameterRef[],
  candidates: [{ id, document, descriptor, thumbnail }]
}
```

- `ParameterRef = { stage: 'generator' | 'operator', index?: integer, key }`.
- **Solo(p)** means “only `p` may change”; **Lock(p)** means “`p` may not
  change”. Solo is represented as a selection with all other numeric
  parameters locked; implementations may store it as a derived selection.
- A 1D sweep of `N` steps samples the parameter at
  `min + i·(max-min)/(N-1)`, `i = 0..N-1`.
- A 2D grid samples both axes with the same rule and produces `N×M`
  candidates.
- Candidate documents are copies; adopting one replaces the current document
  through the normal history path.
- Morph A→B is defined only when both documents have the same generator id,
  the same operator ids in the same order, and the same expression parameter
  structure. Numeric parameters interpolate linearly; expressions and
  selects stay from A unless explicitly listed. If incompatible, the UI must
  offer image crossfade instead of document morph.

### D5: Document v3 introduces layers

Document version 3:

```text
ParametricaDocumentV3 = {
  version: 3,
  name: string,
  seed: number,
  layers: Layer[],
  view: View,
  animation: Animation
}

Layer = {
  id: string,
  name: string,
  visible: boolean,
  seed: number,
  generator: { id, params, mods },
  operators: [{ id, enabled, params, mods }],
  style: LayerStyle
}

LayerStyle = {
  stroke: { color, width, opacity, cap, join },
  fill: { enabled, color, opacity },
  blend: 'normal' | 'multiply' | 'screen' | 'difference'
}
```

- Rendering order is array order, first layer behind.
- Each layer evaluates independently with its own seed; the top-level seed is
  inherited at creation and migration time.
- `view` and `animation` are shared by all layers for v3; animations may
  reference layer parameters by path `layer[i].generator.params.key`.
- The v2 → v3 migration wraps the current generator and operators in one
  layer named “Layer 1” and keeps the document seed.
- Descriptors aggregate layers: `curveCount`, `pointCount`, `area`,
  `perimeter` and `coverage` sum; symmetry/crossings are computed across the
  combined point set; layer-level descriptors are also exposed.
- The v3 document is the contract for composition; slices before it render a
  single v2 layer behind the same interface.

### D6: AI advisor is grounded, validated and optional

Input to the advisor:

```text
AdvisorInput = {
  descriptorVersion: 1,
  current: FigureDescriptor,
  previous?: FigureDescriptor,
  parameterDiff: [{ path, from, to }],
  descriptorDiff: [{ path, from, to, delta }],
  sensitivity: [{ path, impact, direction }],
  documentSummary: object,   // no images by default
  question?: string
}
```

Output:

```text
AdvisorResponse = {
  version: 1,
  summary: string,
  changes: [{ path, from, to, reading }],
  suggestions: [Suggestion],
  caveats: string[]
}

Suggestion = {
  id: string,
  path: string,                  // e.g. operator[1].params.ringScale
  from: number | string,
  to: number | string,
  rationale: string,
  expectedEffect: string,
  confidence: number,            // 0..1
  kind: 'subtle' | 'structural' | 'wild'
}
```

Validation requirements:

- `path` must resolve in the current document.
- Numeric suggestions must be clamped to the schema and rejected if non-finite.
- Select suggestions must be one of the schema options.
- Applying a suggestion runs the normal evaluation; invalid candidates are
  rejected and reported.
- The AI never mutates the document directly; it only proposes suggestions.
- The UI always shows a before/after preview and an explicit Apply action.

Provider:

```text
AiProvider = {
  id: 'fake' | 'ollama' | 'openai-compatible',
  analyse(input): Promise<AdvisorResponse>
}
```

- `fake` is deterministic and used in CI.
- `ollama` is the recommended local default; endpoint configurable.
- `openai-compatible` is optional and must not ship with a key in the repo.
- Network is prohibited in automated tests.
- Images/thumbnails are not sent unless the user explicitly enables a
  “send preview image” option, and the privacy copy explains it.
- Responses are cached by `(documentHash, descriptorVersion, providerId,
  promptVersion)`.

Triggers:

- explicit “Analyze”;
- checkpoint creation;
- 700 ms after a stable commit, only if the AI panel is open;
- never per animation frame.

### D7: Version everything that crosses a boundary

| Artifact | Version | Owner |
|---|---|---|
| Document | 3 | `core/document.js` |
| FigureDescriptor | 1 | `lab/descriptor.js` (future) |
| FigureSnapshot | 1 | `lab/observer.js` (future) |
| Checkpoint | 1 | `lab/notebook.js` (future) |
| ExplorationSession | 1 | `lab/exploration.js` (future) |
| AdvisorInput/Response | 1 | `ai/advisor.js` (future) |

Every version has a migration or explicit rejection path. Old documents and
presets must keep loading.

## Risks / Trade-offs

- **Descriptor scope creep:** every new metric must be justified by a slice
  and covered by a golden fixture. Keep version 1 small.
- **Layer migration:** v3 is a breaking schema change; it must ship with
  migration tests for every built-in preset and the SVG/JSON round-trip.
- **Exploration combinatorics:** a 12×12 grid × 200k points can be expensive.
  Thumbnails use reduced samples and a budget; never evaluate full-resolution
  grids.
- **AI hallucination:** structured output + path validation + preview reduce
  but do not eliminate bad advice. Suggestions are labelled as hypotheses.
- **Provider lock-in:** the adapter interface keeps local/fake/hosted
  interchangeable.
- **Privacy:** descriptor JSON can still reveal a user's parameters. The AI
  panel must state exactly what is sent and offer an offline mode.

## Migration

- `lab-foundations` changes no shipped document or API.
- Future `composition-layers` owns the v2 → v3 migration.
- Future descriptor/checkpoint/advisory versions start at 1 and follow the
  same compatibility policy.
