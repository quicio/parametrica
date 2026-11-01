## 1. Stage capabilities

- [x] 1.1 Add `capabilities` to generator definitions: spatial, projection, fit,
      closed, animation and any existing render needs.
- [x] 1.2 Add a shared `supportsProjection(def)` / `supportsSpatial(def)` helper.
- [x] 1.3 Replace hardcoded id checks in `App.setGenerator`,
      `App.adoptDocument`, `Controls.buildViewSection` and any render/export
      path with capability reads.
- [x] 1.4 Add contract tests proving `helix` and `parametric-3d` are siblings,
      and that adding a third spatial generator needs no core edit.
  - Verify: unit capability tests; e2e projection gating with 2D and 3D models.

## 2. Schema-owned progressive disclosure

- [x] 2.1 Add `advanced`, `group`, `order` metadata to parameter schemas.
- [x] 2.2 Make `Controls` use schema metadata first and the old
      `ADVANCED_PARAM_KEYS` set only as a fallback.
- [x] 2.3 Remove the global fallback after every generator and operator is
      classified.
- [x] 2.4 Keep the single Advanced toggle behavior, including the all-advanced
      generator case.
  - Verify: existing progressive-parameters e2e tests; parameter-group unit
    tests; no duplicate Modulate folder.

## 3. Registry contracts

- [x] 3.1 Add per-kind validation to `Registry.register()`: required fields,
      function fields, categories, schema validity, hooks and capabilities.
- [x] 3.2 Reject duplicate ids and unknown parameter types with actionable
      messages.
- [x] 3.3 Add a test helper that walks every registered definition and asserts
      the contract.
- [x] 3.4 Document the definition contract in SPEC/architecture.
  - Verify: unit group for registry contracts; deliberately invalid test
    definitions fail with the expected message.

## 4. Parameter registry

- [x] 4.1 Create `src/ui/params/ParamRegistry.js` with the six existing types.
- [x] 4.2 Move number sanitize/clamp/snap/hard-bound behavior into the number
      type; remove `_clamp`/`_snap` access from shared UI where possible.
- [x] 4.3 Move boolean, select, expression, source and harmonics editors into
      their type modules.
- [x] 4.4 Keep `ExpressionField` as the shared CodeMirror primitive.
- [x] 4.5 Remove duplicated expression field/error/modulation wiring from
      `Controls` and `OperatorStack`.
  - Verify: param-type unit tests; existing expression, harmonics and modulation
    e2e tests.

## 5. StageEditor

- [x] 5.1 Add `src/ui/params/StageEditor.js` with essential controls, Advanced
      disclosure, one Modulate (time) folder and expression fields.
- [x] 5.2 Use StageEditor for generator parameters.
- [x] 5.3 Use StageEditor for each operator item.
- [x] 5.4 Route generator and operator expression errors through the same
      keyed error API.
- [x] 5.5 Formalize and document `previewParams`, `syncParams`,
      `onExpressionChange` and `migrateParams` hooks.
  - Verify: Warp auto/manual behavior, expression errors and optional expression
    fields; no regression in panel scroll/focus.

## 6. Notebook workspace

- [x] 6.1 Introduce a domain-owned `NotebookWorkspace` with active project,
      active series and save target.
- [x] 6.2 Move active target state out of `NotebookPanel`.
- [x] 6.3 Remove `controls.notebookPanel` reads from `App.saveCheckpoint`.
- [x] 6.4 Keep manual saves free of implicit lineage; Evolution continues to
      pass explicit `parentId`/`parents`.
- [x] 6.5 Add tests for target changes, project/series deletion and lineage
      separation.
  - Verify: notebook workspace unit tests; notebook/evolution e2e.

## 7. Notebook persistence

- [x] 7.1 Extract `NotebookRepository` (`load`, `save`, `clear`) and
      `LocalNotebookRepository`.
- [x] 7.2 Extract versioned `migrateNotebook(raw)` from `Notebook.load()`.
- [x] 7.3 Keep current storage key and read v1/v2 fixtures.
- [x] 7.4 Preserve export/import JSON including projects, series and
      checkpoints.
- [x] 7.5 Add a fake in-memory repository for tests and prepare the interface
      for IndexedDB/remote implementations.
  - Verify: migration fixtures; repository contract tests; export/import
    round-trip e2e.

## 8. Dialog service

- [x] 8.1 Add an injectable `DialogService` with `prompt` and `confirm`.
- [x] 8.2 Replace `window.prompt`/`window.confirm` in NotebookPanel.
- [x] 8.3 Provide a styled production dialog and a fake test dialog.
- [x] 8.4 Keep keyboard/focus behavior accessible.
  - Verify: project/series creation e2e via fake dialog; cancel/escape cases.

## 9. Module boundaries

- [x] 9.1 Split `generators/helpers.js` into `math/periods.js`,
      `sampling/parametric.js`, `render/camera3d.js` and
      `generators/compose.js`.
- [x] 9.2 Keep `generators/helpers.js` as a documented compatibility facade.
- [x] 9.3 Document allowed import direction: core must not import UI.
- [x] 9.4 Add a Node import smoke test that loads the registries without DOM.
  - Verify: unit suite, build and no circular-import warnings.

## 10. Cleanup and release gate

- [x] 10.1 Remove temporary compatibility shims.
- [x] 10.2 Update README, SPEC, architecture and OpenSpec inventories.
- [x] 10.3 Run `npm run check` and the full Playwright suite.
- [x] 10.4 Verify document, preset, notebook, SVG, PNG and session round-trips.
- [x] 10.5 Archive this change after acceptance.

## Verification results

- `npm run lint`: 0 errors.
- `npm test`: 1367/1367 checks, including registry contracts and extensibility boundaries.
- `npm run build`: succeeds.
- `npm run test:e2e`: 71/71 tests.
- `openspec validate --changes`: valid.
- Manual: project/series dialogs use the injected service; manual saves keep their model and no false lineage.

