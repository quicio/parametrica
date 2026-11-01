## Decisions

### D1: Capabilities replace generator-id checks

Generators declare their spatial and UI capabilities in the definition:

```js
Generators.register({
  id: 'helix',
  capabilities: {
    spatial: true,
    projection: '3d',
    supportsFit: true,
    supportsClosed: true,
  },
  ...
});
```

`App`, `Controls`, `P5Renderer` and `Exporter` read capabilities. No core or
shared UI file may compare `id === 'helix'` or `id === 'parametric-3d'`.

This is a capability contract, not a hierarchy: `helix` and `parametric-3d`
remain sibling generators.

### D2: One parameter-type registry

Each parameter type owns its sanitation and its editor:

```js
ParamTypes.register({
  id: TYPE.NUMBER,
  sanitize: sanitizeNumber,
  modulatable: true,
  createControl(schema, stage, onChange, ctx) { ... },
});
```

Initial types: `number`, `boolean`, `select`, `expression`, `source`,
`harmonics`. Future types (color, vector, range, file, matrix) register without
editing `Controls.js` or `OperatorStack.js`.

### D3: One StageEditor for generators and operators

A shared `StageEditor` composes:

- essential controls,
- the advanced disclosure,
- the single `Modulate (time)` folder,
- expression/source editors,
- error routing,
- optional definition hooks.

`Controls` uses it for `document.generator`; `OperatorStack` uses it for each
operator. Duplicated field/error/modulation logic is removed.

### D4: Advanced and UI metadata live in the schema

Each parameter can declare:

```js
samples: {
  type: TYPE.NUMBER,
  advanced: true,
  group: 'sampling',
  order: 20,
}
```

The global `ADVANCED_PARAM_KEYS` set becomes a temporary fallback and is then
removed. Generators and operators control their own progressive disclosure.

### D5: Definition hooks are a formal contract

Optional hooks are grouped and documented:

```js
definition.hooks = {
  previewParams(stage),
  syncParams(stage, key),
  onExpressionChange(stage, key),
  migrateParams(params, rawParams, context),
}
```

The StageEditor invokes them generically. No UI file needs to know about Warp.

### D6: Registry validation fails at registration time

`Registry.register()` validates the definition for its kind:

- generator: `id`, `name`, `category`, `params`, `sample`, optional `domain`,
  `capabilities`, `hooks`;
- operator: `id`, `name`, `category`, `params`, `apply`;
- render pass: `id`, `name`, `draw`.

Validation errors name the offending id, field and expected contract. Unknown
parameter types are rejected unless registered.

### D7: Notebook workspace owns active target

A `NotebookWorkspace` (or equivalent domain state) owns:

```js
{
  activeProjectId,
  activeSeriesId,
  saveTarget: { projectId, seriesId },
}
```

`NotebookPanel` renders and mutates that workspace. `App.saveCheckpoint()`
receives a target or reads the workspace through `App`, never
`controls.notebookPanel`.

Manual saves do not inherit lineage automatically. Evolution passes explicit
`parentId`/`parents`.

### D8: Notebook repository separates domain from storage

```txt
Notebook                  domain rules, hierarchy, validation
NotebookRepository        load/save snapshot interface
LocalNotebookRepository   existing localStorage implementation
migrateNotebook(raw)      versioned v1 → current migration
```

A future IndexedDB, file or remote repository implements the same interface
without changing project/series/checkpoint logic.

### D9: Dialogs are a service

Panels call an injected `DialogService`:

```js
dialogs.prompt({ title, label, value })
dialogs.confirm({ title, message })
```

Production uses styled HTML dialogs. Tests use a fake service. No panel calls
`window.prompt` or `window.confirm` directly.

### D10: Module boundaries are explicit

Target responsibilities:

```txt
math/periods.js          gcd, lcm, rational periods
sampling/parametric.js   sampleParametric, postProcess
render/camera3d.js       cameraFrom, project3D
generators/compose.js    composeCurves and multi-curve helpers
operators/expression.js  optional expression compilation and scopes
```

Import direction:

```txt
core  ← UI
core  ← render/export
generators/operators ← math/sampling
UI may import core and widgets; runtime core modules must not import UI.
`App.js` is the composition root and is the only core file allowed to import
UI modules.
```

### D11: Incremental migration, no big-bang

Each phase must keep all existing tests green and preserve:

- document version and serialization,
- generator/operator ids,
- preset names,
- notebook JSON import,
- SVG/PNG output.

Compatibility shims are allowed for one release and must be listed in tasks.

## Migration strategy

1. Add capabilities and schema metadata; keep old checks temporarily behind a
   helper (`supportsProjection(def)`).
2. Introduce the parameter registry and StageEditor beside the old path.
3. Move generators, then operators, then render passes to validated
   definitions.
4. Move notebook target state and persistence behind facades.
5. Remove shims only after the full suite passes.

## Risks

- **UI regressions** from replacing the parameter binding path. Mitigation:
  shadow-test both editors in one release, compare document writes and field
  visibility.
- **Circular imports** from moving helpers. Mitigation: enforce dependency
  direction and add a Node import smoke test.
- **Notebook data loss** during migration. Mitigation: read old and new
  shapes, never overwrite storage before a successful parse, and test v1/v2
  fixtures.
- **Over-abstraction** of simple parameters. Mitigation: register only the six
  existing types first; new types follow real needs.
- **Dialog refactor** breaking e2e prompt handling. Mitigation: fake dialog
  service in tests and one e2e path per prompt.

## Verification strategy

- Contract tests for every registered generator/operator/pass.
- Param-type tests: sanitize, default, clamp, snap, control creation, error key.
- Notebook workspace tests: active target, manual save lineage, evolution
  lineage, project/series deletion.
- Persistence tests: localStorage repository, v1/v2 migration, import/export.
- E2E: projection gating, advanced disclosure, expression fields, notebook
  hierarchy, dialog-driven project/series creation.
- `npm run check` and full Playwright suite must pass at every phase boundary.
