## Why

`lab-observer` can describe and rank a figure, but discoveries are still
ephemeral: there is only the current document, 50 in-memory undo snapshots and
static presets. A user cannot keep a form, compare it with another, recover it
after reload, or explain its lineage.

`lab-notebook` is the second vertical slice: durable checkpoints with
thumbnails, A/B comparison, lineage and local persistence. It turns the lab
from a live demo into a place where work accumulates.

## What Changes

- Add a pure `src/lab/notebook.js` model with checkpoint creation,
  validation, deletion, lineage, persistence and JSON import/export.
- Add pure `src/lab/diff.js` helpers for document and descriptor diffs.
- Add a `NotebookPanel` with:
  - save current checkpoint
  - thumbnail list
  - A/B selection
  - comparison of parameter and descriptor changes
  - restore, delete, export and import
- Add `P5Renderer.thumbnailDataURL()` with a 64 KB cap and deterministic
  fallback sizes.
- Add `App.saveCheckpoint()`, `restoreCheckpoint()`, notebook import/export
  and notices.
- Add unit tests with an injected storage and an e2e save/compare/reload flow.

## Capabilities

### New Capabilities

- `lab-notebook-panel`: the browser surface for keeping, comparing, restoring
  and porting checkpoints, including thumbnail and diff presentation.

### Modified Capabilities

- None. `lab-notebook` already defines the checkpoint schema, lineage,
  persistence and comparison contracts implemented here.

## Impact

- New: `src/lab/notebook.js`, `src/lab/diff.js`, `src/ui/widgets/NotebookPanel.js`.
- Modified: `src/core/App.js`, `src/ui/Controls.js`, `src/render/P5Renderer.js`,
  `style.css`.
- Tests: group 15 in `test/lab.smoke.mjs`, notebook e2e in `e2e/ui.spec.js`.
- Docs: README, SPEC, roadmap, architecture.
- No document version change. No AI, layers, sweeps or image input.

## Non-goals

- No cloud sync or accounts.
- No autosave of the working document.
- No thumbnail regeneration in the background.
- No notebook editing beyond name/tags/notes/delete.
- No AI summaries of comparisons.
- No change to presets or the document schema.
