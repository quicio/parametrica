## Why

The advisor turns descriptors, diffs and sensitivity into grounded suggestions,
then optionally calls a configured LLM provider with cache and fallback. Both
modules were untyped and sit directly behind the advisor panel.

## What Changes

- Convert `ai/offline.js` and `ai/provider.js` to `.ts`.
- Add typed resolved paths, suggestion results, advisor input/response,
  providers, options and run results.
- Type rule-based suggestions, path validation, response parsing, cache use and
  offline fallback.
- Keep JS compatibility re-exports and point internal imports at `.ts`.

## Out of Scope

- Advisor UI/panel and prompt/cache modules (already typed).
- Changing rules, validation, providers, payloads or fallback behavior.
