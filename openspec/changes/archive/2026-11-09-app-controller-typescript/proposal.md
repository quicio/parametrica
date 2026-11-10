## Why

`application/App.js` was the last application module in JavaScript and the
largest remaining untyped seam in the runtime. It holds the document,
evaluation, history, session, notebook, preview and UI orchestration state.

## What Changes

- Declare the full App controller state and typed method signatures.
- Add `application/appPorts.ts` with structural contracts for services,
  adapters, document/evaluation shapes, renderer, controls and overlays.
- Convert `application/App.js` to `application/App.ts`.
- Keep the JS compatibility re-export.
- Update the architecture test and dependency rule to inspect `App.ts`.

## Out of Scope

- Changing controller behavior, history timing, session policy or UI flows.
- Converting the concrete renderer, UI or exporter adapters.
