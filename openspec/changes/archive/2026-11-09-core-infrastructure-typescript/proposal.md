## Why

The history, persistence, session and notebook storage modules are imported by
the App controller, the notebook panel and the lab. They hold undo snapshots,
the storage migration and the debounced session save, and were the last untyped
`core` infrastructure modules on the persistence path.

## What Changes

- Convert `core/history.js` to `.ts` with a generic snapshot type.
- Convert `core/persistence.js` to `.ts` and type the storage boundary,
  migration result and repository errors.
- Convert `core/session.js` to `.ts` and type schedule/flush/save/load.
- Convert `lab/notebookRepository.js` to `.ts` and type local/memory
  repositories and the notebook migration.
- Keep the JS compatibility re-exports.

## Out of Scope

- `App.js`.
- Changing storage keys, migration order, debounce timing or saved payloads.
