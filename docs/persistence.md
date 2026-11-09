# Persistence model

**Date:** 2026-11-08
**Status:** implemented

Parametrica keeps three product stores separate. They share one storage
boundary (`src/core/persistence.js`) but never share a document.

| Store | Key | Owns | Lifetime |
|---|---|---|---|
| Session | `parametrica.session.v1` | The last editable document plus `savedAt`. Debounced 800 ms. Playback is never restored. | Latest state, replaced on every commit. |
| Notebook | `parametrica.notebook.v1` | Named checkpoints, projects, series, lineage, notes, tags and thumbnails. | Append/edit/remove explicitly. |
| Presets | `parametrica.presets.v0` + `parametrica.presets.meta.v1` | Reusable starting documents and workspace metadata (favorites, recents, user previews). | Explicit save/delete/import. |

Session is not a checkpoint. A notebook checkpoint is not a live view of the
session. A user preset owns a snapshot and is not a reference to the current
document.

## Repository contract

`PersistenceRepository` is the only layer that touches `localStorage` for these
stores:

- `read`/`write` parse and serialise JSON.
- `readText`/`writeText` move raw strings.
- `backup` copies a key once to `<key>.backup.v1`.
- `lastError` is the last storage/parse error.
- `lastQuotaError` is set only for quota-like failures.

Stores keep their in-memory data when a write fails. The UI reports the error;
nothing is deleted to make room.

## Migration

`migrateLocalStorage()` runs once per browser profile:

1. It adopts `glyph-lab.presets.v2` or `glyph-lab.presets.v1` into
   `parametrica.presets.v0` only when the current key is absent.
2. It backs up every existing store key once.
3. It validates JSON but never deletes or rewrites corrupt data.
4. It writes `parametrica.storage.migrated.v1` only after inspecting every key.

The marker makes the migration idempotent. Legacy keys are retained.

## Recovery

- Corrupt session/preset/notebook data is ignored for the current boot.
- The raw value and its backup remain in storage for manual recovery or import.
- A corrupt notebook is reported through `Notebook.lastError`.
- A corrupt preset map falls back to built-ins; a corrupt metadata file falls
  back to empty favorites/recents.
- Quota failures keep the in-memory document, checkpoint or preset usable.

## Verification

- `test/domains/persistence.test.mjs`: repository, migration, isolation,
  corrupt-data preservation, quota behaviour and JSON round-trips.
- `e2e/persistence.spec.js`: legacy migration once, independent reload, and
  snapshot isolation across session/notebook/presets.
