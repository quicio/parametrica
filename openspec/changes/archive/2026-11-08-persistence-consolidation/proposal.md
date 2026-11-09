## Why

Session state, notebook checkpoints and user presets each store documents in
localStorage with separate keys and migrations. The boundaries are implicit and
risk duplication, quota conflicts or loss during migration.

## What Changes

- Define the ownership of session vs notebook vs presets.
- Define one storage schema/versioning policy.
- Add migration from the existing keys.
- Define quota/error/recovery behavior.
- Define export/import of the consolidated store.

## Out of Scope

- Cloud sync.
- Accounts.
- Changes to document semantics.
