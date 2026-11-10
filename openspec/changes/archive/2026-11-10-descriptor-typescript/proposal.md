## Why

The figure descriptor is the shared language of the analysis panel, notebook,
sensitivity and AI advisor. It was the last large untyped lab module and its
result shape is consumed throughout the app.

## What Changes

- Convert `lab/descriptor.ts` to `.ts`.
- Add typed curve/layer/document/options/result contracts.
- Type world, curvature, symmetry, Fourier, complexity, topology and coverage
  helpers.
- Keep the JS compatibility re-export and point internal imports at `.ts`.

## Out of Scope

- Notebook, exploration, evolution and UI.
- Changing descriptor values, budgets or hashing.
