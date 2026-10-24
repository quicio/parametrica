## 1. Pure notebook model (~2 h)

- [x] 1.1 Add `src/lab/notebook.js`: checkpoint sanitization, add/update/remove, limit, lineage, storage injection, export/import.
- [x] 1.2 Add `src/lab/diff.js`: document and descriptor diffs with flattening and deltas.
- [x] 1.3 Tests with in-memory storage: persistence, limit, invalid documents, oversized thumbnails, lineage, export/import and diffs.
  - Verify: group 15 in `test/lab.smoke.mjs`.

## 2. Thumbnail capture (~1 h)

- [x] 2.1 Add `P5Renderer.thumbnailDataURL()` with aspect-preserving offscreen draw and 256→64 px fallback.
- [x] 2.2 Enforce the 64 KB cap and return `null` when impossible.
  - Verify: unit size validation + e2e thumbnail presence.

## 3. App orchestration (~1 h)

- [x] 3.1 Instantiate `Notebook` in `App`; expose `saveCheckpoint`, `restoreCheckpoint`, `deleteCheckpoint`, `importNotebook`, `exportNotebook`.
- [x] 3.2 Save uses the current analysis descriptor and renderer thumbnail; parent defaults to the latest checkpoint.
- [x] 3.3 Restore uses `adoptDocument` so it is undoable; notify on storage failures.
  - Verify: unit App-free model + e2e restore/reload.

## 4. Notebook panel (~2 h)

- [x] 4.1 Add `src/ui/widgets/NotebookPanel.js`: name/save, newest-first list, thumbnails, empty state, A/B buttons, restore/delete, compare view.
- [x] 4.2 Show parameter diff and descriptor diff with old → new values and deltas.
- [x] 4.3 Add export/import controls with file input and notices.
- [x] 4.4 Add the Notebook section to Controls and styles consistent with the instrument.
  - Verify: e2e save, compare, reload, export/import.

## 5. Verification and docs (~1 h)

- [x] 5.1 Run `npm test`, `npm run build`, `npm run test:e2e`; record counts.
- [x] 5.2 Update README/SPEC/roadmap/architecture with the notebook slice and counts.
- [x] 5.3 Validate and archive `lab-notebook`; confirm `lab-notebook-panel` spec exists.

## Verification results

- `npm test`: **738/738 checks** (group 15 added).
- `npm run build`: succeeds; bundle warning unchanged.
- `npm run test:e2e`: **34/34 tests**, including save/compare/reload and
  restore-through-history.
- `openspec change validate lab-notebook`: valid.
