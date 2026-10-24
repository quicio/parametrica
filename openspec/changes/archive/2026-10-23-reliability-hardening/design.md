## Context

Parametrica's core is DOM-free and deterministic; the UI composes it via
`App`, `Controls` and `P5Renderer`. The review fixes cross all three
layers. This document records the contracts that make each fix
unambiguous and testable.

## Goals / Non-Goals

**Goals**

- Restore the two broken UI surfaces and make the panel idempotent.
- Guarantee document isolation and seed-aware determinism.
- Enforce schema and point budgets before they can exhaust memory.
- Make errors actionable (inline key + visible message).
- Define, once, what `samples` means per generator.
- Add regression tests, a runnable e2e gate and accurate docs.

**Non-Goals**

- Autosave/session recovery, Web Workers, new geometry features, JSON
  version bump, external UI libraries.

## Decisions

### D1: `samples` has two explicit modes

For every generator with a `samples` parameter:

- **Uniform mode** (`adaptive = false`): output exactly `samples` points
  (single-curve generators), evenly spaced over the parameter domain.
- **Adaptive mode** (`adaptive = true`): `samples` is a **hard upper
  bound**. The output contains the coarse grid plus refinement points
  and is guaranteed to satisfy

  $$2 \le \text{points.length} \le \texttt{samples}.$$

The generators that previously lacked an `adaptive` toggle (Lissajous,
rose, superformula, trochoids, harmonic oscillator) gain one, defaulting
to `true`, so every Samples slider has an exact-count mode.

Alternative considered: make `samples` a target point count in adaptive
mode. Rejected: adaptive sampling exists precisely to use fewer points
on smooth regions; forcing the target would either over-sample or turn
adaptive mode into uniform mode.

### D2: Adaptive sampler algorithm

Inputs: `fn(t)`, `[t0, t1]`, `minSteps`, `maxDepth`, `tolerance`,
`samples`.

1. `requested = max(2, floor(samples))`.
2. `intervals = max(1, min(floor(minSteps), requested - 1))`.
3. Sample the coarse grid $t_i = t_0 + (t_1-t_0)i/\text{intervals}$,
   $i=0..\text{intervals}$; these points are always retained.
4. For each coarse interval, evaluate the midpoint and compute the
   perpendicular distance to the chord. Default tolerance is
   `bbox(coarse).diagonal / 600`.
5. Maintain a max-heap of intervals keyed by `(error, -tLeft)` for
   deterministic tie-breaking. While `points.length < requested` and the
   largest error exceeds tolerance and its depth is below `maxDepth`:
   split that interval at its midpoint, add exactly one point, and push
   the two children with their own midpoint errors.
6. Sort retained points by parameter and drop duplicate parameters.

Consequences: the final endpoint is always present, no output can exceed
the cap, and budget is spent where curvature is largest.

### D3: Cache signature includes seed, time and quality

The stage cache key becomes

```text
JSON.stringify([seed, time, quality, stage.id, stage.params,
                stage.mods, stage.enabled, camera])
```

`document.seed` changes therefore invalidate every stage. Time is also
in the key (not only in the `prev.time === time` guard) so future cache
shapes cannot silently reuse animated output.

### D4: Schema clamping happens at resolution time

`resolveParams` evaluates a value and then applies `clampNumber`:

$$
v' = \min(s.max, \max(s.min, v)),\qquad
v'' = \operatorname{round}(v'/s.step)\cdot s.step
$$

when the schema provides those fields; the result is rounded to five
decimals. Non-finite values fall back to the schema default and append a
keyed error. `sanitizeValue` uses the same helper for base values, so
storage and resolution cannot diverge.

### D5: Budgets apply after every stage

After each generator/operator `apply`, the engine calls
`enforceBudget(curves)` with the existing limits:

- `MAX_POINTS_PER_CURVE = 50_000`
- `MAX_TOTAL_POINTS = 200_000`

Decimation keeps evenly spaced points. The evaluation result exposes
`stats.peakPoints` (maximum total points observed across stages) so the
regression test can prove an intermediate stage did not explode before
the cap. Operators that allocate their full output still allocate once;
the cap prevents that allocation from propagating or entering analysis.

### D6: Lazy analysis, eager cheap stats

`evaluateDocument` returns a result whose `analysis` property is a
lazy getter. `stats.pointCount`, `stats.arcLength` and `bbox` are
computed eagerly with $O(n)$ passes that do not allocate per-point
vectors. `analysisMs` starts at 0 and is filled when the getter runs.
The renderer only reads `analysis` when an active render pass or overlay
needs it (inflections, tangents, normals, curvature); mutation
validation and pure geometry consumers never pay the full differential
cost.

### D7: Error tagging

`compileOrThrow(source, label, key)` attaches `error.key = key`.
`runGuarded` copies `key` and `span` into the structured error.
`Controls.showErrors` maps generator errors to expression fields by key;
the telemetry appends the first error message. Operator expression
errors (`warp`) also carry keys for future operator-level surfaces.

### D8: Document defaults are factory-created

`createDefaultView()` returns fresh `modes`, `overlays` and `camera`
objects. `createDocument` and `sanitizeDocument` use it (with a
deep-cloned merge for overrides). `schemaDefaults` deep-clones object or
array defaults via `structuredClone`, so harmonic tables are never
shared between documents.

### D9: Preset namespaces

Built-in preset names are reserved. `PresetManager.save` throws
`Preset name "<name>" is built-in` before writing. The UI catches the
error and shows it in the notice area. Import failures and successful
imports also use the notice area.

### D10: Undo/redo is snapshot-based and coalesced

`src/core/history.js` owns a pure `History` class:

- `record(snapshot)` pushes the previous snapshot onto `past` and clears
  `future`; `limit = 50`.
- `undo(current)` returns `past.pop()` and pushes `current` to `future`.
- `redo(current)` mirrors it.

`App` keeps a JSON snapshot of the current document. Every call to
`App.rebuild()` schedules a commit; commits coalesce within 350 ms so a
slider drag is one history entry. `undo`/`redo` restore a sanitized
document, rebuild the UI and reset the scheduling baseline. Keyboard:
`Ctrl/Cmd+Z`, `Ctrl/Cmd+Shift+Z` and `Ctrl/Cmd+Y`, ignored while focus
is in an input, textarea, select or contenteditable element. The
Mutation panel exposes Undo/Redo buttons and the current seed.

### D11: Closure is derived from geometry

`isClosedPolyline(points, eps = 1e-6)` compares the first and last
points. Auto-closed generators (Lissajous, superformula, Fourier, rose,
trochoids) use it for `curve.closed` instead of hardcoding `true`.
Generators with an explicit `closed` parameter keep user control.

## Risks / Trade-offs

- **Budget decimation changes geometry** for deliberately huge
  operator stacks. This is the intended trade-off; telemetry exposes
  `peakPoints` and the final count.
- **Lazy analysis** means consumers that read `analysis` pay on first
  access. The property remains enumerable and behaves like a plain
  value; only timing changes.
- **Undo snapshots** are full JSON documents (tens of KB at most). The
  50-entry cap bounds memory. Coalescing may merge rapid distinct edits
  within 350 ms; acceptable for a creative instrument.
- **Closure derivation** may mark a nearly-closed curve open if the
  endpoint error exceeds 1e-6. Sampling domains that are mathematically
  periodic land well inside that tolerance; a stricter epsilon can be
  tuned later.
- **Per-stage budgeting** can drop curves if the remaining budget is
  exhausted, preserving the existing "decimate rather than freeze"
  behavior.

## Migration

No JSON version bump. Old documents keep loading; `samples` semantics
are tightened to the documented cap, and old documents without an
`adaptive` key receive `true` from the schema defaults.
