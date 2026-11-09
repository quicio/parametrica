## Why

The application still imported render look data, the render scene contract and
picking math. The broad UI surface also remained for Form, Look, Keep, Ingest,
Advisor and Start With while Controls still selected the Product preview chunk.

## What Changes

- Move look presets, applyUserLookToView, render scene contracts and ray/picker
  math into `domain/`.
- Keep compatibility re-exports at the old render/interaction paths.
- Inject ProductPreview loading through composition.
- Add Form, Look, Keep, Ingest, Advisor and Start With ports.
- Shrink the Controls surface to the members Controls actually uses.
- Add `application-no-render`, `application-no-interaction` and
  `ui-no-composition` rules.
- Keep the dependency baseline empty.

## Out of Scope

- TypeScript conversion.
- Changing panel behavior or export bytes.
