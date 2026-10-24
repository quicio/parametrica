## Context

`openspec/specs/figure-observation/spec.md` defines the descriptor,
sensitivity and stable-snapshot contracts. `lab-observer` implements them for
the current single-layer document and exposes them in the panel.

This slice is intentionally synchronous: no worker, no AI and no persistence.
It establishes the shapes and the UI that later slices will reuse.

## Goals / Non-Goals

**Goals**

- Deterministic descriptor with a stable hash.
- Deterministic sensitivity ranking.
- A panel that makes the metrics legible without opening devtools.
- Parameter documentation available at the point of interaction.
- Unit and e2e coverage for the walking skeleton.

**Non-Goals**

- Notebook, sweeps, layers, AI, image input.
- Background computation when the panel is closed.
- Changes to the document schema.

## Decisions

### D1: Pure lab modules, App orchestrates

```
src/lab/hash.js         canonical JSON + SHA-256
src/lab/descriptor.js   computeDescriptor(document, curves, options)
src/lab/sensitivity.js  computeSensitivity(document, curves, options)
src/ui/widgets/LabPanel.js
```

- `computeDescriptor` is pure and synchronous. It receives already-evaluated
  curves; it does not evaluate documents.
- `computeSensitivity` evaluates the base document plus `±delta` candidates
  through `evaluateDocument`, writes only to throwaway documents, and returns
  a sorted report.
- `App.analyzeFigure({ sensitivity })` is the single entry point used by UI
  and tests.

### D2: Canonical hash

`canonicalStringify(value)` recursively sorts object keys and preserves array
order. The hash is SHA-256 over the UTF-8 bytes of that string.

A pure SHA-256 implementation lives in `src/lab/hash.js` so the core remains
browser- and Node-compatible without `node:crypto` or Web Crypto async APIs.
Known vectors (`""`, `"abc"`) are unit tests.

### D3: Descriptor metric implementation

The formulas come from `openspec/specs/figure-observation` and its design
notes. Implementation choices:

- Shape analysis uses `analyzeCurve` per curve; descriptor analysis is
  explicit and therefore allowed to pay the differential cost.
- `symmetry` uses a 128-bin radial signature around the bbox centre. A
  constant signature means `folds = 1` and `score = 1`. Otherwise the best
  non-zero circular correlation gives `score`, and `folds = round(128 / shift)`
  for the best shift. Open curves use the best of reflection/180° rotation
  Chamfer scores with `folds = 1`.
- `crossings` uses `selfIntersections` and `polylineIntersections` on a
  deterministic 160-point sample when the figure has more points. For figures
  with ≤160 points it uses the full curve. The descriptor exposes
  `analysis.intersectionsSampled` so the UI can label the value as an
  estimate. This keeps automatic metrics under ~70 ms even on a 20k-point
  attractor.
- `fourier` uses the largest closed curve (or the largest curve when no closed
  one exists), resampled to 512 points. Harmonics 1..32, top five by amplitude
  and a weighted spectral centroid.
- `turningNumber` is the absolute accumulated tangent-angle change divided by
  `2π`, sampled on the resampled curve.
- `fractalDimension` is a box-counting slope over four scales and is clamped to
  `[1, 2]`.
- `topology.components` groups curves whose bounding boxes overlap; `holes`
  counts closed curves whose centroid lies inside a larger closed curve.
- `coverage` marks a 64×64 grid over the bbox.
- No metric may be `NaN` or `Infinity`; degenerate cases return `0`.

### D4: Sensitivity

```
delta(p) = max(step, (max - min) · 0.02)
impact(p) = shapeDistance(descriptor(p + delta), descriptor(p - delta))
```

- Numeric base values only; AnimatableValue objects are skipped in this slice.
- `shapeDistance` resamples each curve to at most 128 points, concatenates
  curves, caps the total at 512 points and uses symmetric Chamfer distance
  normalised by the base bbox diagonal.
- Candidates are evaluated at the current time and never adopted.
- Default `maxParams = 12`; order is generator params first, then operators.
- The report is sorted by `impact` descending, then by path for deterministic
  tie-breaking.

### D5: Panel lifecycle

- The Analysis section is always visible.
- After a stable commit (300 ms), the panel refreshes metrics only.
- The “Analyze influence” button runs the full descriptor + sensitivity and
  shows a busy status.
- During animation, automatic refresh is suppressed; the last result stays
  visible. Full analysis remains available on demand.
- Errors are caught and shown in the panel; the app keeps running.

### D6: Parameter documentation

`bindStageParams` attaches `schema.doc` to the controller element as a
`title` and `aria-description`. Expression fields receive the doc string and
show it as the label title. This keeps the panel compact while making the
math discoverable.

## Risks / Trade-offs

- **Intersection cost:** capped as described; counts may be approximate above
  the cap.
- **Symmetry heuristic:** radial correlation is good for rosettes and poor for
  some open forms; documented as a heuristic, not a proof.
- **Sensitivity cost:** up to 24 extra evaluations; mitigated by an explicit
  button and a 12-parameter cap.
- **Main thread:** synchronous analysis may briefly block on very heavy
  documents. A worker is deferred to a later slice.
- **Tooltip discoverability:** titles are not visible on touch; a future
  parameter guide can reuse the same strings.
