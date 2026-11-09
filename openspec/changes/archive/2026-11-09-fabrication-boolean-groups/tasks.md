## 1. Contract

- [x] 1.1 Add `fabrication.groups` to the document schema.
- [x] 1.2 Sanitize group operations and layer ids.
- [x] 1.3 Resolve groups independently.
- [x] 1.4 Merge group results as multiple bodies.
- [x] 1.5 Report group metadata and failure reasons.

## 2. UI

- [x] 2.1 Show grouped body counts.
- [x] 2.2 Disable the single boolean selector for grouped presets.

## 3. Verification

- [x] 3.1 Add a grouped multi-body preset.
- [x] 3.2 Assert body and group counts.
- [x] 3.3 Assert product preview works for the grouped mesh.
- [x] 3.4 Run full gates.

## Acceptance criteria

- Grouped presets export independent bodies.
- Group failure is explicit and non-destructive.
- Existing presets and exports do not regress.
