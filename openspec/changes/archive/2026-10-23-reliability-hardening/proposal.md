## Why

A code review of v0.1.0 found that the mathematical core is strong while
the browser UI is untested and carries several contract violations:

1. Selecting the Fourier generator (or either Fourier preset) throws
   `TypeError: this.getRows is not a function` and aborts the panel build.
2. The Viz Modes control writes a string into `view.modes`, which the
   renderer iterates as characters; the canvas goes blank and the live
   document becomes invalid.
3. `createDocument()` shares `DEFAULT_OVERLAYS`, `DEFAULT_CAMERA` and
   the default modes array between documents, so toggling an overlay or
   dragging the camera in one document mutates every future document
   and built-in preset.
4. The engine cache key omits `document.seed`; after a preset/import or
   a mutation that re-rolls the seed, noise-based geometry can be stale.
5. Modulated numeric values bypass schema bounds: `samples` can be set
   to 50 000 through a `time` expression although the schema max is
   $8\,000$, enabling accidental freezes.
6. Generator expression errors are not tagged with a parameter key, so
   the inline error surface never shows them.
7. `samples` is not passed to most adaptive generators and the adaptive
   sampler can return one more point than requested; the Samples slider
   is effectively inert above the coarse grid.
8. The point budget is enforced only after the whole operator stack, so
   topology operators can propagate tens of millions of points into the
   next stage and into analysis.
9. Undo/redo is absent, so mutation and structural edits are destructive.
10. e2e tests exist but are not runnable without a manually started dev
    server, there is no CI, and README/SPEC counts are stale.

Why now: these are all local, high-leverage fixes. They make the
existing product honest (G5, G6), prevent data loss, and turn the e2e
suite into a real regression gate before adding new generators.

## What Changes

- **UI reliability**
  - Wire `HarmonicsEditor` with its `{ getRows, onChange }` API and
    write harmonic rows back into the generator stage.
  - Replace the scalar lil-gui mode selector with per-pass checkbox
    toggles that update `view.modes` as a `string[]`.
  - Reuse the existing Presets section when rebuilding its GUI so
    save/delete no longer appends empty duplicate sections.
  - Add visible notices for import/preset failures instead of
    console-only warnings.
  - Add bounded undo/redo (50 snapshots) for structural actions,
    mutations and parameter edits, plus keyboard shortcuts.
  - Add a document seed field and a reroll action in the Mutation panel.
- **Document integrity**
  - Deep-clone view defaults and schema defaults so documents are
    isolated.
  - Reject saving a user preset with a built-in preset name.
  - Derive `closed` from the sampled endpoints for generators whose
    parameters can produce open curves (Lissajous, superformula,
    Fourier, rose, trochoids).
- **Engine safety**
  - Include seed, time and quality in stage cache signatures.
  - Clamp modulated/evaluated numeric values to schema min/max/step.
  - Enforce per-curve/total point budgets after every pipeline stage.
  - Tag generator expression errors with their schema key and surface
    the first message in telemetry.
  - Make full differential analysis lazy; compute cheap stats eagerly.
- **Sampling contract**
  - Define `samples` as a hard upper bound for adaptive generators and
    the exact count for uniform sampling.
  - Rewrite `sampleAdaptive` to always include the final endpoint, never
    exceed the cap, and fill unused budget in priority order.
  - Add an `adaptive` toggle to every adaptive generator so the Samples
    slider has an exact-count mode.
- **Quality gates**
  - Configure Playwright `webServer`; add a Fourier/viz-modes/error-
    inline e2e suite.
  - Add GitHub Actions CI: unit tests, build, e2e.
  - Add regression tests for all contracts above.
  - Update README, SPEC, architecture docs and counts; add responsive
    and focus-visible styles; label the canvas for assistive tech.

## Capabilities

### New Capabilities

- `ui-reliability`: working Fourier editor, array-safe Viz Modes,
  non-duplicating Presets panel, visible failure notices, undo/redo and
  seed controls.
- `document-integrity`: no shared mutable defaults across documents;
  built-in preset names protected; closure flags reflect geometry.
- `engine-safety`: seed-aware cache, schema-clamped modulation,
  per-stage budgets, keyed errors, lazy analysis.
- `sampling-contract`: uniform/adaptive sample-count semantics across
  every generator, with an endpoint-complete, cap-respecting sampler.
- `quality-gates`: runnable e2e suite, CI, regression tests, and docs
  that match the shipped code.

### Modified Capabilities

- `parametrica-document`: view defaults are cloned per document; no
  schema shape changes.
- `parametrica-engine`: cache signatures and point budgeting become
  part of the stage contract; the public evaluation result keeps the
  same shape.
- `parametrica-sampling`: adaptive sampler output semantics are
  tightened; callers that pass `samples` get a guaranteed cap.

## Impact

- `src/core/document.js`, `src/core/schema.js`, `src/core/engine.js`
- `src/animation/animatable.js`
- `src/sampling/sampling.js`, `src/generators/*` (adaptive generators)
- `src/ui/Controls.js`, `src/ui/widgets/HarmonicsEditor.js`,
  `src/ui/widgets/modeToggles.js` (new), `src/core/history.js` (new)
- `src/core/App.js`, `src/main.js`, `style.css`, `index.html`
- `test/lab.smoke.mjs`, `e2e/*.spec.js`, `playwright.config.js`
- `.github/workflows/ci.yml` (new)
- `README.md`, `SPEC.md`, `docs/architecture.md`

## Non-goals

- No autosave/session recovery in this change. Undo/redo covers the
  destructive-edit gap; session persistence stays a separate decision.
- No Web Workers or asynchronous evaluation. The lazy-analysis and
  per-stage budget fixes reduce main-thread cost without changing the
  synchronous pipeline contract.
- No new generators, operators or render passes.
- No multi-select framework dependency; the mode toggles are plain
  checkboxes, consistent with the existing Swiss panel.
- No changes to the document JSON version or schema keys. All new view
  behavior uses existing fields.
