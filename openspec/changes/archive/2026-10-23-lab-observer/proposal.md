## Why

The foundation specs define what a figure descriptor, sensitivity report and
parameter documentation must be. The app still does not expose any of it:
users can move sliders but cannot see what changed, which parameter matters,
or what a parameter means. That is the shortest path from “parameter toy” to
“experimental lab”.

`lab-observer` is the walking skeleton for the new modes: one complete
vertical path from evaluation to descriptor to UI to tests. It deliberately
excludes notebook, sweeps, layers and AI.

## What Changes

- Add a pure `src/lab/hash.js` with canonical JSON and SHA-256.
- Add a pure `src/lab/descriptor.js` implementing
  `figure-observation` version 1.
- Add a pure `src/lab/sensitivity.js` implementing central perturbation and
  shape-distance ranking.
- Add a `LabPanel` widget with descriptor metrics, sensitivity ranking,
  explicit full analysis and automatic metric refresh after stable commits.
- Surface schema `doc` strings as controller tooltips and expression-field
  titles.
- Add `App.analyzeFigure()` as the single orchestration entry point.
- Add unit fixtures and an e2e suite for the panel and parameter docs.

## Capabilities

### New Capabilities

- `lab-observer-panel`: the browser surface for observing a figure, showing
  deterministic metrics and sensitivity, and exposing parameter documentation.

### Modified Capabilities

- None. `figure-observation` already defines the descriptor and sensitivity
  contracts implemented here.

## Impact

- New: `src/lab/hash.js`, `src/lab/descriptor.js`, `src/lab/sensitivity.js`,
  `src/ui/widgets/LabPanel.js`.
- Modified: `src/core/App.js`, `src/ui/Controls.js`,
  `src/ui/widgets/OperatorStack.js`, `src/ui/widgets/ExpressionField.js`,
  `style.css`.
- Tests: `test/lab.smoke.mjs` group 14 and `e2e/ui.spec.js`.
- Docs: README, SPEC, roadmap status, test counts.
- No document version change. No new dependency. No AI, notebook, layers,
  sweeps or image input.

## Non-goals

- No AI narrative or suggestions.
- No checkpoint persistence.
- No variation grids or morphing.
- No layers or style system.
- No changes to the descriptor schema beyond `figure-observation` v1.
- No async workers; full analysis is synchronous in this slice.
