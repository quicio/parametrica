## Why

The lab feature set is complete, but four deferred quality items remain:
no automated lint gate, a hand-rolled textarea editor, a monolithic bundle
that loads p5 before the first usable frame, and no protection against losing
a session on reload. The documentation also lists finished work as deferred.

## What Changes

- Add ESLint flat config, `npm run lint`, and a CI lint step.
- Replace the custom textarea editor with CodeMirror 6 and a math-aware
  tokenizer.
- Lazy-load p5 and split vendor chunks so the initial app shell stays small.
- Add debounced localStorage session snapshots with an explicit Restore /
  Dismiss banner.
- Correct README/SPEC/architecture inventories and deferred lists.

## Capabilities

### New Capabilities

- `quality-gates`: lint, CI and documentation consistency.
- `formula-editor`: CodeMirror-based math editing and highlighting.
- `session-recovery`: local snapshots and explicit recovery.
- `bundle-performance`: lazy renderer loading and chunk budgets.

### Modified Capabilities

- None. Existing document, notebook and render contracts are unchanged.

## Impact

- `eslint.config.js`, `package.json`, `.github/workflows/ci.yml`
- `src/ui/widgets/ExpressionField.js`, `style.css`
- `src/render/P5Renderer.js`, `vite.config.js`, `src/main.js`
- new `src/core/session.js`, `src/core/App.js`
- `test/lab.smoke.mjs`, `e2e/quality.spec.js`
- docs

## Non-goals

- No Prettier reformat of the repository.
- No collaborative/cloud session sync.
- No server-side persistence.
- No changes to the document schema or rendering semantics.
