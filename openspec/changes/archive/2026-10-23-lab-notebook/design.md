## Context

`openspec/specs/lab-notebook/spec.md` defines the checkpoint schema, lineage,
thumbnail cap, persistence and A/B contracts. This slice implements them for
the current single-layer document and exposes a notebook panel.

It builds on `figure-observation` (descriptors) and `lab-observer` (the
descriptor panel and analysis entry point).

## Goals / Non-Goals

**Goals**

- Keep a form exactly as it was.
- See what changed between two forms.
- Recover forms after reload and move them between machines as JSON.
- Keep thumbnails cheap and bounded.
- Reuse descriptor/diff logic for the future AI advisor.

**Non-Goals**

- Cloud, collaboration, autosave, background thumbnail generation, AI.

## Decisions

### D1: Pure notebook model with injected storage

```
src/lab/notebook.js
  Notebook({storage, now, limit=50})
  add({name, document, descriptor, thumbnail, parentId, tags, notes})
  update(id, patch)
  remove(id)
  get(id)
  compare(idA, idB)
  exportJSON()
  importJSON(text, {replace})
```

- `storage` is any `{getItem,setItem}` object; tests use an in-memory
  implementation and the browser uses `localStorage`.
- `now` is injectable for deterministic tests.
- `limit = 50`; older checkpoints are dropped when the limit is exceeded.
- A checkpoint is rejected if its document does not sanitize or its
  descriptor is missing/invalid.
- `parentId` is only kept if it references an existing checkpoint; otherwise
  it becomes `null`.
- Storage key: `parametrica.notebook.v1`.
- Storage failures are reported through `lastError`; the in-memory notebook
  remains usable.

### D2: Checkpoint validation

`sanitizeCheckpoint(raw)`:

- requires a string `id`, a valid sanitized `document`, and a descriptor object
  with `version === 1`;
- truncates `name` to 80 chars and falls back to “Untitled”;
- keeps at most 12 tags, each ≤24 chars;
- truncates `notes` to 2 000 chars;
- accepts `thumbnail` only if it is a PNG data URL ≤ 65 536 chars; otherwise
  `null`;
- `createdAt` must be finite, otherwise `Date.now()`;
- `parentId` must be a string or `null`.

`add` always stores a deep-cloned document so later edits cannot mutate a
checkpoint.

### D3: Thumbnails

`P5Renderer.thumbnailDataURL(maxSize = 256)`:

1. Read the current p5 canvas.
2. Draw it onto an offscreen canvas preserving aspect ratio.
3. Encode PNG.
4. If the data URL exceeds 64 KB, retry at 192, 128, 96, 64 px.
5. If still oversized, return `null`.

Capturing the canvas is a UI concern; the notebook model only validates and
stores the string.

### D4: Diffs

`src/lab/diff.js` exposes:

```text
documentDiff(a, b)  → [{ path, from, to }]
descriptorDiff(a, b) → [{ path, from, to, delta }]
```

- `documentDiff` compares `seed`, `generator`, and each operator, flattening
  nested params/mods/harmonics. It excludes `view` and `animation` in this
  slice.
- `descriptorDiff` flattens numeric descriptor fields, excluding
  `documentHash`, `generator`, `operators`, `analysis` and array-valued
  `fourier.topHarmonics`.
- Both are deterministic and ignore unchanged values.
- Missing leaves are represented as `undefined` and the UI renders them as
  “—”.

### D5: Notebook panel

- Section **Notebook** after Analysis.
- Name input defaults to the document name.
- **Save checkpoint** captures the current document, descriptor and
  thumbnail; parent is the previously selected/latest checkpoint.
- List is newest-first, with thumbnail, name, date, tags and buttons:
  `A`, `B`, `Restore`, `Delete`.
- Default selection after saving: A = new checkpoint, B = previous A.
- **Compare A/B** shows side-by-side thumbnails, parameter diff and descriptor
  diff.
- Export downloads `parametrica-notebook.json`; import reads a file and merges
  valid checkpoints, reporting skipped entries.
- Empty state explains how to save.

### D6: App orchestration

- `App.notebook = new Notebook({ storage: localStorage })`.
- `App.saveCheckpoint(name, { parentId })`:
  - ensure `lastAnalysis` matches the current figure (recompute descriptor if
    needed);
  - capture thumbnail through the renderer;
  - add and notify.
- `App.restoreCheckpoint(id)` uses `adoptDocument` (history and UI rebuild).
- `App.importNotebook(text)` merges and refreshes the panel.
- Notebook operations never modify the document, except restore.

### D7: E2E flow

1. Save checkpoint A.
2. Change the seed.
3. Save checkpoint B.
4. Compare A/B and assert a parameter diff exists.
5. Reload the page.
6. Assert both checkpoints and thumbnails survive.

## Risks / Trade-offs

- **localStorage quota:** thumbnails + documents can approach the quota.
  `lastError` and notices surface failures; the limit keeps growth bounded.
- **Thumbnail fidelity:** canvas captures current view (modes/overlays).
  It is a visual index, not the form source of truth.
- **Descriptor mismatch on import:** imported checkpoints require a descriptor;
  older exports without one are rejected. A future migration can recompute.
- **UI rebuild:** restoring a checkpoint rebuilds Controls and therefore the
  notebook panel; selection state is intentionally ephemeral.
