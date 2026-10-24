## 1. Provider layer

- [x] 1.1 Add provider interface + fake/ollama/openai-compatible adapters.
- [x] 1.2 Add prompt builder and response parser/validator.
- [x] 1.3 Tests: fake determinism, invalid response rejection, cache hits,
  no-network CI.
  - Verify: unit group 22.

## 2. UI

- [x] 2.1 Provider settings, privacy copy, analyze button.
- [x] 2.2 Suggestion preview/apply/dismiss.
- [x] 2.3 Failure → offline fallback.
  - Verify: e2e with fake provider.

## 3. Verification

- [x] 3.1 Full test/build/e2e.
- [x] 3.2 Docs/roadmap.
- [x] 3.3 Validate/archive.

## Verification results

- `npm test`: **882/882 checks** (group 22 added).
- `npm run build`: succeeds; the existing >500 kB chunk warning is unchanged.
- `npm run test:e2e`: **47/47 tests**, including fake-provider cache/privacy,
  debounce/playback suppression and network-failure fallback.
- `openspec validate --changes`: valid.
