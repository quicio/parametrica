## 1. Preset

- [x] 1.1 Add the Vortex Stack factory with source, five instances and view.
- [x] 1.2 Add Compositions category and preset metadata.
- [x] 1.3 Resolve built-in generator badges through the first generator layer.

## 2. Previews

- [x] 2.1 Normalize layer ids and source references in preview hashes.
- [x] 2.2 Bump preview version and verify composition previews render.
  - Verify: unit tests for factory validity, determinism, metadata and hash
    stability; e2e for apply, active layer, search and preview.

## 3. Acceptance

- [x] 3.1 Document the preset and its limitations.
- [x] 3.2 Run `npm run check`, `npm run test:e2e`, strict OpenSpec validation
      and archive.

## Acceptance criteria

- Vortex Stack appears under Compositions and is searchable.
- Applying it loads one hidden source and five instances without errors.
- The active layer is the first instance.
- Source parameter changes propagate to all instances.
- The preset preview is stable across factory invocations.
- No new workspace, operator, document version or export behavior.
