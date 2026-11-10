## Why

The notebook is the durable record of forms; exploration and evolution generate
candidates from typed documents and parameter refs. They were the last large
untyped lab model modules behind the Lab and Notebook panels.

## What Changes

- Convert `lab/notebook.js`, `lab/exploration.js` and `lab/evolution.js` to `.ts`.
- Add typed project/series/checkpoint, candidate, morph, child and generation
  contracts.
- Type storage, limits, sanitization, sweeps, randomisation, grids, crossovers
  and structural changes.
- Keep JS compatibility re-exports and point internal imports at `.ts`.

## Out of Scope

- Lab panels/UI and candidate rendering.
- Changing notebook limits, candidate math, validation or storage formats.
