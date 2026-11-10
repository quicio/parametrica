## Why

`core/engine` is the mathematical pipeline used by every surface in the app:
App, previews, presets, mutation, sensitivity, lab, export and UI. It was the
last untyped core module and carried implicit stage, curve, geometry and
evaluation shapes.

## What Changes

- Add `core/engineTypes.ts` with typed points, curves, geometry, errors, stats,
  layer results, evaluations, options and cache entries.
- Convert `core/engine.js` to `.ts` with typed evaluation stages, caches,
  spatial/surface/instance pipelines and budget helpers.
- Keep the JS compatibility re-export and point internal imports at `.ts`.
- Narrow App, mutation and preview boundaries to the typed evaluation.

## Out of Scope

- Geometry kernels, generators, operators, render adapters and UI.
- Changing evaluation, caching, budgets or projection behavior.
