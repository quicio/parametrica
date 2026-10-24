## 1. Document and schema isolation (~1 h)

- [x] 1.1 Add `createDefaultView()` returning fresh `modes`/`overlays`/`camera`; use it in `createDocument` and `sanitizeDocument`.
  - Verify: unit group 13 — mutate doc A overlays/camera/modes, assert doc B unchanged.
- [x] 1.2 Deep-clone object/array defaults in `schemaDefaults`; reuse in `sanitizeParams`.
  - Verify: unit group 13 — Fourier harmonic defaults are not shared.
- [x] 1.3 Reject built-in preset names in `PresetManager.save`.
  - Verify: unit group 13 — `save('Lissajous 3:5', doc)` throws and user store is unchanged.

## 2. Engine determinism and safety (~2 h)

- [x] 2.1 Add seed/time/quality to the stage cache signature.
  - Verify: unit group 13 — `noise(t)` output changes after seed change; same seed is deterministic.
- [x] 2.2 Extract `clampNumber(schema, value)` and apply it to resolved modulations/AnimatableValues.
  - Verify: unit group 13 — `samples` modulation `50000` under max 8000 emits ≤ 8000 points.
- [x] 2.3 Enforce `enforceBudget` after every stage and expose `stats.peakPoints`.
  - Verify: unit group 13 — 20k attractor × radial repeat 48 reports `peakPoints <= 200000`.
- [x] 2.4 Make `analysis` lazy; add `stats.analysisMs`; skip analysis in the renderer unless an active pass/overlay needs it.
  - Verify: unit group 13 — `analysisMs === 0` before access and finite after; e2e curvature pass renders.
- [x] 2.5 Attach `key`/`span` to `compileOrThrow` errors and surface the first message in telemetry.
  - Verify: unit group 13 — invalid `exprX`/`exprR` produce keyed errors; e2e inline `.has-error`.

## 3. Sampling contract (~2 h)

- [x] 3.1 Rewrite `sampleAdaptive` with a priority queue: coarse grid always retained, budget filled by largest chord error, endpoint always included, output `<= samples`.
  - Verify: unit group 11 extended — endpoint equals `fn(t1)`, lengths 50/200 cases, all outputs `<= cap`.
- [x] 3.2 Pass `samples` to every adaptive generator and add `adaptive` boolean to Lissajous, rose, superformula, trochoids, harmonic oscillator.
  - Verify: unit group 13 — `adaptive=false, samples=321` yields 321 points per single-curve generator.
- [x] 3.3 Derive `closed` from endpoints for auto-closed generators.
  - Verify: unit group 13 — 3:5 Lissajous closed; 1.25:5 open; superformula example open.

## 4. UI reliability and recovery (~2 h)

- [x] 4.1 Wire `HarmonicsEditor` with `getRows`/`onChange`; reset the editor reference on full rebuild.
  - Verify: e2e Fourier preset smoke test; unit constructor-with-fake-DOM test.
- [x] 4.2 Replace the lil-gui Viz Modes selector with per-pass checkboxes backed by a pure `toggleMode` helper.
  - Verify: unit helper test; e2e `Array.isArray(view.modes)` + selected id.
- [x] 4.3 Make the Presets section rebuild in place (no duplicate sections).
  - Verify: e2e save two presets, assert one Presets section.
- [x] 4.4 Add a notice area and route import/preset/clipboard failures through it.
  - Verify: e2e invalid import shows `.notice`.
- [x] 4.5 Add `History` snapshot class, App integration, keyboard shortcuts, panel buttons, seed field + reroll.
  - Verify: unit History push/undo/redo/limit; e2e add operator → undo restores; seed change changes geometry.

## 5. Quality gates and polish (~2 h)

- [x] 5.1 Add `webServer` to Playwright; add `e2e/ui.spec.js` covering Fourier, modes, inline error, undo, seed.
  - Verify: `npm run test:e2e` from a clean checkout.
- [x] 5.2 Add `.github/workflows/ci.yml` (npm ci, Playwright browser, test, build, e2e).
  - Verify: workflow file parses; local commands green.
- [x] 5.3 Update README/SPEC/docs counts and milestone status; note lazy analysis and per-stage budgets.
  - Verify: counts match registries after `npm test`.
- [x] 5.4 Responsive layout at ≤900 px, focus-visible styles, canvas aria label, expression label association.
  - Verify: manual narrow-viewport check; no e2e regression.

## 6. Verification (~1 h)

- [x] 6.1 Run `npm test`, `npm run build`, and (when browsers are available) `npm run test:e2e`.
  - Verify: all green; record the final check count for docs.
- [x] 6.2 Update the OpenSpec task checkboxes and summarize changed files.
  - Verify: `git diff --stat` and task list match the implementation.

## Verification results

- `npm test`: **679/679 checks** (groups 1–13).
- `npm run build`: Vite production build succeeds (bundle warning only).
- `npm run test:e2e`: **30/30 Playwright tests** against the auto-started
  Vite server; includes the new `e2e/ui.spec.js` regression suite.
