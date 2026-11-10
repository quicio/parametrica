## Types

- `History<T>` with typed `past`/`future` snapshots.
- `StorageLike`, `MigrationResult`, `PersistenceRepository`.
- `SessionStore` with a typed clock and timeout handle.
- `NotebookRepository`, `NotebookSnapshot`, `LocalNotebookRepository`,
  `MemoryNotebookRepository`.

## Rules

- `core` stays DOM-free and only depends on `core`.
- Storage access is narrowed behind `StorageLike`.
- JSON payloads remain `unknown` until sanitized.
- Migration keys, order and errors stay identical.

## Verification

- `tsc --noEmit`, Node, arch and e2e gates pass.
- Undo/redo, session recovery, storage migration and notebook persistence
  behave unchanged.
