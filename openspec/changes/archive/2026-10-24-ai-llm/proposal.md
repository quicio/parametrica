## Why

With deterministic observation, notebook diffs and offline suggestions in
place, a model can add language and richer hypotheses without becoming the
source of geometry. This slice adds the optional provider layer.

## What Changes

- Add an `AiProvider` interface: `fake`, `ollama`, `openai-compatible`.
- Build grounded prompts from descriptor/diff/sensitivity/document summary.
- Validate structured responses against the suggestion schema.
- Add provider configuration, privacy copy, caching and debounce.
- Use a fake provider in CI; no network in automated tests.
- Add optional thumbnail/image opt-in for aesthetic critique.

## Capabilities

### New Capabilities

- `ai-llm-panel`: provider configuration, grounded prompts, validated
  responses, caching and privacy controls.

### Modified Capabilities

- None. `ai-advisor` defines the input/output and provider contracts.

## Impact

- new `src/ai/provider.js`, `src/ai/prompt.js`, `src/ai/cache.js`
- `src/ui/widgets/AdvisorPanel.js`
- `src/ui/Controls.js`, `style.css`
- tests + e2e + docs

## Non-goals

- No hosted backend in this slice.
- No automatic apply.
- No image upload unless explicitly opted in.
- No prompt engineering UI.
