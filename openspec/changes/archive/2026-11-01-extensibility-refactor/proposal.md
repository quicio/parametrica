## Why

Parametrica already has a stable pipeline, a document model, registries and a
solid test suite. The remaining friction is architectural rather than
functional:

- Core files know specific generator ids (`helix`, `parametric-3d`).
- The inspector mixes schema binding, advanced grouping, modulation fields,
  expression editors, hard bounds and lil-gui internals in one widget.
- Every new parameter type requires edits in several unrelated files.
- `App.saveCheckpoint()` reads the active project/series from a UI panel.
- `Notebook` mixes domain rules, hierarchy, validation, migrations and
  localStorage I/O.
- `NotebookPanel` uses blocking `window.prompt`/`window.confirm`.
- `generators/helpers.js` mixes period math, sampling, post-processing and 3D
  projection.
- Registry registration is not validated, so broken definitions fail later.

This slice is a strangler refactor: preserve every current document, preset,
generator id, operator id and user-facing workflow while making the extension
points explicit and testable.

## What Changes

- Add declarative stage capabilities (`spatial`, `projection`, `fit`, …) and
  remove hardcoded generator-id checks from core and UI.
- Move `advanced` classification from a global key list into each parameter
  schema.
- Introduce a parameter-type registry and a shared `StageEditor` used by both
  generator parameters and operators.
- Formalize optional definition hooks (`previewParams`, `syncParams`,
  `onExpressionChange`, `migrateParams`) behind a documented contract.
- Add registration-time validation for generators, operators and render
  passes.
- Move the active notebook target (project + series) out of `NotebookPanel`
  into a workspace/domain object; `App` must never read UI state.
- Split `Notebook` from persistence through a repository interface; keep
  localStorage as the default implementation and add versioned migrations.
- Make project/series naming and confirmation dialogs injectable instead of
  calling `window.prompt`/`window.confirm` inside the panel.
- Split generator helpers by responsibility and document dependency rules.
- Add contract tests, migration tests and e2e coverage for each boundary.

## Capabilities

### New Capabilities

- `stage-capabilities`: declarative generator metadata replacing id checks.
- `parameter-registry`: registered parameter types and a shared StageEditor.
- `registry-contracts`: validated stage definitions and hooks.
- `notebook-workspace`: domain-owned active project/series and save targets.
- `notebook-persistence`: repository abstraction and versioned migrations.
- `ui-dialogs`: injectable prompt/confirm services.
- `module-boundaries`: responsibility-based helpers and import direction rules.

### Modified Capabilities

- `orthographic-projection`: projection availability is resolved from stage
  capabilities, not hardcoded generator ids.
- `progressive-parameters`: advanced/essential classification is schema-owned.
- `lab-notebook`: checkpoint schema documents `projectId`, `seriesId` and
  `order`; organization and lineage remain separate concerns.

## Impact

- `src/core/App.js`, `src/core/registry.js`, `src/core/schema.js`,
  `src/core/document.js`
- `src/ui/Controls.js`, `src/ui/widgets/OperatorStack.js`,
  `src/ui/widgets/NotebookPanel.js`
- `src/lab/notebook.js`
- `src/generators/helpers.js` and generator definitions
- `src/operators/**`, `src/render/**`
- `test/lab.smoke.mjs`, `e2e/**`
- README/SPEC/architecture and OpenSpec specs

## Non-goals

- No visual redesign, no new generator family and no new operator feature.
- No document schema or preset format break.
- No cloud sync, IndexedDB migration or collaborative editing.
- No change to curve sampling, render math or export output.
- No big-bang file moves; boundaries are introduced incrementally.
