## Decision area

- Session = last editable document, debounced.
- Notebook = named checkpoints with thumbnails/lineage.
- Presets = reusable starting documents.
- User presets may reference a document snapshot, not a live session.
- One repository layer with separate stores and a shared migration/versioning
  policy is preferred over one merged blob.

## Migration

- Read legacy keys.
- Migrate idempotently.
- Keep a backup key for one release.
- Never delete user data on parse failure.

## Acceptance

- Reload restores session, notebook and presets independently.
- Quota failure is visible and non-destructive.
- Export/import round-trips.
