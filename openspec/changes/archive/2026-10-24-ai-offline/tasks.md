## 1. Advisor core

- [x] 1.1 Add `src/ai/offline.js` with narration and rule suggestions.
- [x] 1.2 Add suggestion validation against document schema.
- [x] 1.3 Tests: golden A/B fixtures, invalid paths, clamped values, no mutation.
  - Verify: unit group 19.

## 2. UI

- [x] 2.1 Advisor panel with checkpoint selectors, summary, changes, suggestions.
- [x] 2.2 Preview/apply through history; dismiss.
- [x] 2.3 Empty/no-change states.
  - Verify: e2e compare + apply.

## 3. Verification

- [x] 3.1 Full test/build/e2e.
- [x] 3.2 Docs/roadmap.
- [x] 3.3 Validate/archive.

## Verification results

- `npm test`: **847/847 checks** (group 21 added).
- `npm run build`: succeeds; bundle warning unchanged.
- `npm run test:e2e`: **44/44 tests**, including advisor compare/preview/apply.
- `openspec change validate ai-offline`: valid.
