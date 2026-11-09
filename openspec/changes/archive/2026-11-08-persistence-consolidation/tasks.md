## 1. Contract

- [x] 1.1 Decide store ownership and naming.
- [x] 1.2 Define versioning/migration.
- [x] 1.3 Define quota/error policy.

## 2. Migration

- [x] 2.1 Read legacy session/notebook/preset keys.
- [x] 2.2 Migrate idempotently.
- [x] 2.3 Preserve backup and failures.

## 3. Verification

- [x] 3.1 Round-trip tests.
- [x] 3.2 Quota failure test.
- [x] 3.3 E2E reload/recovery.

## Acceptance criteria

- Session, notebook and presets restore independently.
- Migration is idempotent.
- No user data is deleted on failure.
- Export/import round-trips.
