## 1. Quality gates

- [x] 1.1 Add ESLint flat config, `npm run lint` and `npm run check`.
- [x] 1.2 Add the lint step to CI and fix existing findings.
- [x] 1.3 Correct README/SPEC/architecture inventories and deferred lists.
  - Verify: `npm run lint` exits 0; docs match the registries and test counts.

## 2. Formula editor

- [x] 2.1 Replace the textarea overlay with CodeMirror 6.
- [x] 2.2 Add math token highlighting, single-line safeguards, Enter/Mod-Enter commit, refresh and disposal.
- [x] 2.3 Update e2e selectors and assert `.cm-editor`, contenteditable and token spans.
  - Verify: existing equation e2e tests + `e2e/quality.spec.js`.

## 3. Bundle

- [x] 3.1 Dynamic-import p5 and expose `renderer.readyPromise`.
- [x] 3.2 Split p5, CodeMirror, lil-gui and geometry vendors into chunks.
- [x] 3.3 Guard renderer methods before the sketch exists and document the lazy chunk budget.
  - Verify: `npm run build`; e2e waits for the canvas.

## 4. Session recovery

- [x] 4.1 Add versioned `SessionStore` with debounce, flush, load, clear and quota handling.
- [x] 4.2 Save after document commits; flush on visibility/page hide; disable playback in snapshots.
- [x] 4.3 Add the Restore/Dismiss banner and pause autosave while a snapshot is pending.
  - Verify: unit group 26 + `e2e/quality.spec.js`.

## 5. Verification

- [x] 5.1 Full lint/test/build/e2e.
- [x] 5.2 Docs/roadmap.
- [x] 5.3 Validate/archive.

## Verification results

- `npm run lint`: **0 errors**.
- `npm test`: **1152/1152 checks** (group 26 added).
- `npm run build`: succeeds with no chunk-size warning; eager chunks are
  ≤286 kB, p5 is emitted as a lazy 1.07 MB chunk.
- `npm run test:e2e`: **57/57 tests**, including CodeMirror, lazy p5, autosave
  and recovery.
- `openspec validate --changes`: valid.
