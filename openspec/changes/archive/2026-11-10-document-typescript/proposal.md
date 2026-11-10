## Why

`core/document` is the serializable source of truth for the whole runtime:
engine, presets, session, notebook, App, export, fabrication and UI. It was the
last large untyped core module and every caller relied on implicit shapes.

## What Changes

- Add `core/documentTypes.ts` with the document, view, layer, style, animation
  and override contracts.
- Convert `core/document.js` to `.ts` with typed defaults, creation,
  sanitization, layer aliases, fabrication settings and v1 migration.
- Point `App` at the shared document type instead of a duplicate shape.
- Keep the JS compatibility re-export and point internal imports at `.ts`.
- Update the architecture check to inspect `document.ts`.

## Out of Scope

- `core/engine.js`, presets, notebook and UI.
- Changing document shape, defaults, sanitization, aliases or migration.
