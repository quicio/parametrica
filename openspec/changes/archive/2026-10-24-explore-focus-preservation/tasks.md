## 1. Preserve parameter-only adoption context

- [x] 1.1 Add structure check and in-place merge in `App.adoptCandidate`.
- [x] 1.2 Add `Controls.refreshValues()` for lil-gui controllers and explore axis labels.
- [x] 1.3 Keep the candidate strip after adoption.
  - Verify: e2e `explore keeps the panel scroll and focus`.

## 2. Preserve full-rebuild context

- [x] 2.1 Capture/restore `#ui.scrollTop` in `Controls.build`.
- [x] 2.2 Add `data-focus-id` to Explore/Analyze/Notebook controls and restore focus with `preventScroll`.
- [x] 2.3 Preserve strip horizontal scroll in `renderCandidates`.
  - Verify: e2e randomize scroll delta < 8 px and focus checks.

## 3. Verification

- [x] 3.1 `npm test`, `npm run build`, `npm run test:e2e`.
- [x] 3.2 Validate and archive the change.

## Verification results

- `npm test`: **755/755 checks**.
- `npm run test:e2e`: **37/37 tests**, including the new scroll/focus regression.
- `npm run build`: succeeds.
- `openspec change validate explore-focus-preservation`: valid.
