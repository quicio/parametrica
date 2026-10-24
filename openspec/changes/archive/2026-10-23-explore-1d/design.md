## Context

`openspec/specs/exploration-session/spec.md` defines parameter references,
Solo/Lock, 1D/2D sweeps, directed randomisation, morph and adoption. This
slice implements the 1D subset and its browser panel.

## Goals / Non-Goals

**Goals**

- Make a family visible as a strip of thumbnails.
- Keep candidate generation pure, deterministic and non-destructive.
- Let one parameter be isolated or protected.
- Adopt a candidate through the existing history path.
- Reuse preview rendering for future grids/morph.

**Non-Goals**

- 2D grids, morph, persistence of un-adopted candidates, workers, AI.

## Decisions

### D1: Shared ParameterRef helpers

`src/lab/parameters.js` owns:

- `numericParameterRefs(document)`
- `schemaForRef`, `stageForRef`, `pathForRef`, `sameRef`, `refKey`

`sensitivity.js` and `exploration.js` use the same helpers, so a parameter
path means the same thing in the observer, explorer and future notebook/AI.

### D2: ExplorationSession is pure

```
new ExplorationSession(document)
  setSelection(refs)
  setLocks(refs)
  select(ref, bool)
  setLock(ref, bool)
  solo(ref)
  sweep1D(ref, {steps})
  randomize({intensity, count, seed})
```

- The constructor deep-clones the base document.
- Candidates are deep clones with exactly the selected/locked rules applied.
- `sweep1D` samples `min + i·(max-min)/(steps-1)` over the schema range.
- `randomize` uses `mulberry32(seed)`, a Gaussian perturbation and
  `clampNumber`; locked refs are never touched.
- `solo(ref)` selects one ref and locks every other numeric ref.
- The model never adopts or mutates the live document.

### D3: Candidate previews

`src/render/thumbnail.js`:

```text
curvesDataURL(curves, { size, bounds, background, stroke, strokeWeight })
boundsOf(groups)
```

- Plain 2D canvas, no p5 dependency.
- Shared `bounds` across a family keeps scale comparable (important for
  `fit`/`radius`-style parameters).
- Previews are browser-only; the pure model and tests do not depend on DOM.

`ExplorePanel` evaluates each candidate with `evaluateDocument` at the current
time, computes the union bounds, draws thumbnails, and keeps the candidate
documents for adoption.

### D4: Panel behavior

- Axis select defaults to the first non-technical numeric parameter.
- Technical defaults: `samples`, `adaptive`, `fit`, `size`, `seed`, `steps`,
  `skip`, `dt`, `duration`, t-domain, turns and depth attenuation.
- Steps: 8, 12, 16, 24.
- Scope details list every numeric ref with:
  - checkbox: included in randomize
  - `S`: Solo (only this one selected; all other refs locked)
  - `L`: Lock (excluded and disabled)
- Default selection is the active axis only.
- Randomize intensity: 0.02–0.50, default 0.15; six candidates.
- Clicking a candidate calls `App.adoptCandidate(document)`, which sanitizes
  and routes through `adoptDocument` (history/undo/UI rebuild).
- The strip is newest preview state, horizontal scroll, 132 px thumbnails.

### D5: Evaluation and caching

- Candidate evaluation uses the existing engine. It may overwrite the engine
  cache, but the live app document has a different identity, so the next
  evaluation recomputes normally.
- Invalid candidates (errors or no curves) are skipped, not adopted.
- No candidate is added to history until clicked.

### D6: Error handling

- Empty selection: randomize reports “Select at least one parameter”.
- Missing schema range: strip reports the parameter has no finite range.
- Evaluation or canvas failure: status line, other candidates remain usable.

## Risks / Trade-offs

- **Cost:** 12 candidates evaluate synchronously. Default forms are cheap;
  very heavy documents can pause the UI. A worker/async preview is future work.
- **Approximation:** thumbnails use a shared scale and simplified stroke,
  so they index the family rather than matching the final canvas pixel-perfectly.
- **UI state:** selection/locks reset when Controls rebuilds (generator change
  or preset apply). Acceptable for this slice; a persistent session comes later.
- **Parameter list length:** generators with many numeric refs produce a long
  scroll area; `<details>` keeps it collapsed by default.
