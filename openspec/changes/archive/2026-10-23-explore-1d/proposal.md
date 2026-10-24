## Why

The notebook can keep forms, but finding a family still requires moving one
slider and remembering the previous result. This slice makes the parameter
space visible: choose an axis, generate a strip of candidates, lock what must
not change, and adopt a variation.

It is the first slice that produces candidate documents at scale, so it also
establishes the preview pipeline that later 2D grids and morphing will reuse.

## What Changes

- Add `src/lab/parameters.js` with shared `ParameterRef` helpers.
- Add `src/lab/exploration.js` with a pure `ExplorationSession`:
  - selection and locks
  - Solo semantics
  - deterministic 1D sweeps over schema ranges
  - seeded scoped randomisation
- Add a plain-canvas preview module (`src/render/thumbnail.js`) so candidates
  can be rendered without touching the live p5 document.
- Add `ExplorePanel`:
  - axis selector and step count
  - intensity control
  - parameter scope with select/Solo/Lock
  - generated candidate strip with thumbnails
  - click to adopt through history
- Add `App.adoptCandidate()`.
- Add unit tests for session semantics and e2e tests for strip/adopt and
  locked randomisation.

## Capabilities

### New Capabilities

- `lab-exploration-panel`: the browser surface for choosing an axis,
  constraining parameters, generating candidate thumbnails and adopting one.

### Modified Capabilities

- None. `exploration-session` already defines selection, locks, sweep,
  randomisation and adoption contracts implemented here.

## Impact

- New: `src/lab/parameters.js`, `src/lab/exploration.js`,
  `src/render/thumbnail.js`, `src/ui/widgets/ExplorePanel.js`.
- Modified: `src/core/App.js`, `src/ui/Controls.js`, `style.css`,
  `src/lab/sensitivity.js` (shared parameter helpers).
- Tests: unit group 16, explore e2e flows.
- Docs: README, SPEC, roadmap, architecture.
- No document version change. No AI, layers, morphing or image input.

## Non-goals

- No 2D grid.
- No morph between endpoints.
- No candidate persistence outside adoption.
- No background thumbnail workers.
- No automatic aesthetic selection.
- No new generator/operator.
