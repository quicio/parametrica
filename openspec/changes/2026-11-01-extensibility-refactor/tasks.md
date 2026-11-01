## 1. Stage capabilities

- [ ] 1.1 Add `capabilities` to generator definitions: spatial, projection, fit,
      closed, animation and any existing render needs.
- [ ] 1.2 Add a shared `supportsProjection(def)` / `supportsSpatial(def)` helper.
- [ ] 1.3 Replace hardcoded id checks in `App.setGenerator`,
      `App.adoptDocument`, `Controls.buildViewSection` and any render/export
      path with capability reads.
- [ ] 1.4 Add contract tests proving `helix` and `parametric-3d` are siblings,
      and that adding a third spatial generator needs no core edit.
  - Verify: unit capability tests; e2e projection gating with 2D and 3D models.

## 2. Schema-owned progressive disclosure

- [ ] 2.1 Add `advanced`, `group`, `order` metadata to parameter schemas.
- [ ] 2.2 Make `Controls` use schema metadata first and the old
      `ADVANCED_PARAM_KEYS` set only as a fallback.
- [ ] 2.3 Remove the global fallback after every generator and operator is
      classified.
- [ ] 2.4 Keep the single Advanced toggle behavior, including the all-advanced
      generator case.
  - Verify: existing progressive-parameters e2e tests; parameter-group unit
    tests; no duplicate Modulate folder.

## 3. Registry contracts

- [ ] 3.1 Add per-kind validation to `Registry.register()`: required fields,
      function fields, categories, schema validity, hooks and capabilities.
- [ ] 3.2 Reject duplicate ids and unknown parameter types with actionable
      messages.
- [ ] 3.3 Add a test helper that walks every registered definition and asserts
      the contract.
- [ ] 3.4 Document the definition contract in SPEC/architecture.
  - Verify: unit group for registry contracts; deliberately invalid test
    definitions fail with the expected message.

## 4. Parameter registry

- [ ] 4.1 Create `src/ui/params/ParamRegistry.js` with the six existing types.
- [ ] 4.2 Move number sanitize/clamp/snap/hard-bound behavior into the number
      type; remove `_clamp`/`_snap` access from shared UI where possible.
- [ ] 4.3 Move boolean, select, expression, source and harmonics editors into
      their type modules.
- [ ] 4.4 Keep `ExpressionField` as the shared CodeMirror primitive.
- [ ] 4.5 Remove duplicated expression field/error/modulation wiring from
      `Controls` and `OperatorStack`.
  - Verify: param-type unit tests; existing expression, harmonics and modulation
    e2e tests.

## 5. StageEditor

- [ ] 5.1 Add `src/ui/params/StageEditor.js` with essential controls, Advanced
      disclosure, one Modulate (time) folder and expression fields.
- [ ] 5.2 Use StageEditor for generator parameters.
- [ ] 5.3 Use StageEditor for each operator item.
- [ ] 5.4 Route generator and operator expression errors through the same
      keyed error API.
- [ ] 5.5 Formalize and document `previewParams`, `syncParams`,
      `onExpressionChange` and `migrateParams` hooks.
  - Verify: Warp auto/manual behavior, expression errors and optional expression
    fields; no regression in panel scroll/focus.

## 6. Notebook workspace

- [ ] 6.1 Introduce a domain-owned `NotebookWorkspace` with active project,
      active series and save target.
- [ ] 6.2 Move active target state out of `NotebookPanel`.
- [ ] 6.3 Remove `controls.notebookPanel` reads from `App.saveCheckpoint`.
- [ ] 6.4 Keep manual saves free of implicit lineage; Evolution continues to
      pass explicit `parentId`/`parents`.
- [ ] 6.5 Add tests for target changes, project/series deletion and lineage
      separation.
  - Verify: notebook workspace unit tests; notebook/evolution e2e.

## 7. Notebook persistence

- [ ] 7.1 Extract `NotebookRepository` (`load`, `save`, `clear`) and
      `LocalNotebookRepository`.
- [ ] 7.2 Extract versioned `migrateNotebook(raw)` from `Notebook.load()`.
- [ ] 7.3 Keep current storage key and read v1/v2 fixtures.
- [ ] 7.4 Preserve export/import JSON including projects, series and
      checkpoints.
- [ ] 7.5 Add a fake in-memory repository for tests and prepare the interface
      for IndexedDB/remote implementations.
  - Verify: migration fixtures; repository contract tests; export/import
    round-trip e2e.

## 8. Dialog service

- [ ] 8.1 Add an injectable `DialogService` with `prompt` and `confirm`.
- [ ] 8.2 Replace `window.prompt`/`window.confirm` in NotebookPanel.
- [ ] 8.3 Provide a styled production dialog and a fake test dialog.
- [ ] 8.4 Keep keyboard/focus behavior accessible.
  - Verify: project/series creation e2e via fake dialog; cancel/escape cases.

## 9. Module boundaries

- [ ] 9.1 Split `generators/helpers.js` into `math/periods.js`,
      `sampling/parametric.js`, `render/camera3d.js` and
      `generators/compose.js`.
- [ ] 9.2 Keep temporary re-exports if needed for a single release.
- [ ] 9.3 Document allowed import direction: core must not import UI.
- [ ] 9.4 Add a Node import smoke test that loads the registries without DOM.
  - Verify: unit suite, build and no circular-import warnings.

## 10. Cleanup and release gate

- [ ] 10.1 Remove temporary compatibility shims.
- [ ] 10.2 Update README, SPEC, architecture and OpenSpec inventories.
- [ ] 10.3 Run `npm run check` and the full Playwright suite.
- [ ] 10.4 Verify document, preset, notebook, SVG, PNG and session round-trips.
- [ ] 10.5 Archive this change after acceptance.

## Verification results

Pending implementation.
