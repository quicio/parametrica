## Why

The schema, registry, layer graph, capabilities and fill-gradient helpers are
imported everywhere: engine, document sanitization, generators, operators,
render passes, App and UI. They were the last untyped core support modules and
carried implicit shapes through the whole runtime.

## What Changes

- Convert `core/schema.js` to `.ts` with typed schema entries, params,
  harmonics and sanitization.
- Convert `core/registry.js` to `.ts` with typed stage/generator/operator/
  render-pass definitions and registries.
- Convert `core/layers.js` to `.ts` with typed layer/source/generator shapes
  and instance helpers.
- Convert `core/capabilities.js` and `core/fillGradient.js` to `.ts`.
- Keep the JS compatibility re-exports and point internal imports at `.ts`.

## Out of Scope

- `core/document.js` and `core/engine.js`.
- Changing schema defaults, registry validation, layer rules or gradients.
