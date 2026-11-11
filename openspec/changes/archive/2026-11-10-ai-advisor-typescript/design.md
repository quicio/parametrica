## Types

- `ResolvedPath`, `SuggestionResult`, `AdvisorInput`, `AdvisorResponse`.
- `ProviderConfig`, `AdvisorProvider`, `RunAdvisorOptions`,
  `RunAdvisorResult`.
- `NumericRef` for rule-based suggestions.

## Rules

- Suggestion validation and clamping are unchanged.
- Provider payloads/endpoints and offline fallback are unchanged.
- Cache keys and prompt versions are unchanged.

## Verification

- `tsc --noEmit`, Node, arch and e2e gates pass.
- Offline suggestions, provider calls, cache and fallback are unchanged.
