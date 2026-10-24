## 1. Model

- [x] 1.1 Add numeric crossover, mutation and structural operator changes.
- [x] 1.2 Add generation metadata and validation.
- [x] 1.3 Tests: determinism, clamping, invalid-child rejection, lineage.
  - Verify: unit group 24.

## 2. UI

- [x] 2.1 Parent selection from notebook.
- [x] 2.2 Generate/keep children with previews.
- [x] 2.3 Show generation lineage in notebook.
  - Verify: e2e select/generate/keep.

## 3. Verification

- [x] 3.1 Full test/build/e2e.
- [x] 3.2 Docs/roadmap.
- [x] 3.3 Validate/archive.

## Verification results

- `npm test`: **1000/1000 checks** (group 24 added).
- `npm run build`: succeeds; the existing >500 kB chunk warning is unchanged.
- `npm run test:e2e`: **50/50 tests**, including breed/keep/lineage.
- `openspec validate --changes`: valid.
