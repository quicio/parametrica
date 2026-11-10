## 1. Conversion

- [x] 1.1 Type bounded history snapshots.
- [x] 1.2 Type the persistence repository and migration.
- [x] 1.3 Type the debounced session store.
- [x] 1.4 Type the notebook repositories and migration.
- [x] 1.5 Keep the compatibility re-exports.

## 2. Verification

- [x] 2.1 Run typecheck, Node, arch and e2e gates.
- [x] 2.2 Archive and release.

## Acceptance criteria

- `history`, `persistence`, `session` and `notebookRepository` are strict
  TypeScript.
- All existing storage, session and notebook tests pass.
- No storage key, migration, timing or payload behavior changes.
