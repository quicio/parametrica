## Why

The roadmap's AI mode must be grounded. Before any provider call, the app
should explain deterministic changes and propose rule-based experiments. This
slice makes the advisor useful offline and defines the validation path for a
later LLM.

## What Changes

- Add an advisor model that consumes descriptor/diff/sensitivity.
- Generate deterministic summaries and suggestions without a network.
- Validate suggestions against the live schema.
- Add an A/B/analysis panel with preview/apply.
- Reuse notebook checkpoints as A/B inputs.
- Define the fake provider boundary for future LLM work.

## Capabilities

### New Capabilities

- `ai-offline-panel`: deterministic explanation, rule-based suggestions,
  validation and explicit application.

### Modified Capabilities

- None. `ai-advisor` already defines the input/output contracts.

## Impact

- new `src/ai/offline.js`, `src/ui/widgets/AdvisorPanel.js`
- `src/lab/descriptor.js`, `diff.js`, `sensitivity.js`
- `src/ui/Controls.js`, `style.css`
- tests + e2e + docs

## Non-goals

- No LLM, no network, no API key.
- No automatic aesthetic ranking.
- No automatic apply.
- No image analysis.
