## 1. Contract

- [ ] 1.1 Decide store ownership and naming.
- [ ] 1.2 Define versioning/migration.
- [ ] 1.3 Define quota/error policy.

## 2. Migration

- [ ] 2.1 Read legacy session/notebook/preset keys.
- [ ] 2.2 Migrate idempotently.
- [ ] 2.3 Preserve backup and failures.

## 3. Verification

- [ ] 3.1 Round-trip tests.
- [ ] 3.2 Quota failure test.
- [ ] 3.3 E2E reload/recovery.

## Acceptance criteria

- Session, notebook and presets restore independently.
- Migration is idempotent.
- No user data is deleted on failure.
- Export/import round-trips.
