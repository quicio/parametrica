## 1. Model

- [x] 1.1 Add timeline schema/sanitization and resolution in evaluation.
- [x] 1.2 Add easing + deterministic sampling.
- [x] 1.3 Tests: interpolation, loop, clamping, precedence, determinism.
  - Verify: unit group 18.

## 2. UI

- [x] 2.1 Timeline panel, transport, tracks and keyframes.
- [x] 2.2 Add/remove keyframes and easing.
- [x] 2.3 Record slider gestures.
  - Verify: e2e create/play/scrub.

## 3. Export

- [x] 3.1 Frame sequence + manifest.
- [x] 3.2 Test exact frame timestamps and dimensions.
  - Verify: unit + e2e download.

## 4. Verification

- [x] 4.1 Full test/build/e2e.
- [x] 4.2 Docs/roadmap.
- [x] 4.3 Validate/archive.

## Verification results

- `npm test`: **833/833 checks** (group 20 added).
- `npm run build`: succeeds; bundle warning unchanged.
- `npm run test:e2e`: **43/43 tests**, including track/keyframe creation,
  recording at the playhead and ZIP frame export.
- `openspec change validate motion-timeline`: valid.
