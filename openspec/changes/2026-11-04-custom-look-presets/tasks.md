## 1. Model and storage

- [x] 1.1 Add versioned user-look storage and sanitization.
- [x] 1.2 Add save/apply/overwrite/delete operations.
- [x] 1.3 Reserve built-in names and handle corrupt storage.

## 2. UI

- [x] 2.1 Add name/save controls and user-look list.
- [x] 2.2 Show confirmations for overwrite/delete.
- [x] 2.3 Keep built-ins immutable and N/A behavior intact.
  - Verify: unit storage/operations and e2e save/apply/delete.

## 3. Acceptance

- [x] 3.1 Document user-look scope and limitations.
- [x] 3.2 Run `npm run check`, `npm run test:e2e`, strict OpenSpec validation
      and archive.

## Acceptance criteria

- Users can save and reapply a view-level look.
- User looks never change geometry/style/units/camera.
- Built-ins remain immutable.
- Storage failures/corruption do not break Look.
- No new workspace.
