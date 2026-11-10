## Why

Preset previews feed Start With and the preset browser, while the advisor cache
and prompt builder ground the optional LLM layer. They were the last untyped
support modules around presets and AI.

## What Changes

- Convert `presets/preview.js` to `.ts` with typed documents, keys and
  preview options.
- Convert `ai/cache.js` to `.ts` with a bounded generic cache.
- Convert `ai/prompt.js` to `.ts` with typed advisor input, messages and
  compact descriptor/document summaries.
- Keep the JS compatibility re-exports and point internal imports at `.ts`.
- Broaden the engine option JSDoc for preview cache bypass.

## Out of Scope

- `ai/provider.js`, `ai/offline.js`, preset catalog/builtins and Start With UI.
- Changing preview keys/thumbnails or prompt payloads.
