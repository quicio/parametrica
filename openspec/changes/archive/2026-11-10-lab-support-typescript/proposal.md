## Why

The lab helpers resolve parameter references, own the active notebook target,
summarize parametric layers, diff documents/descriptors, hash content and run
sensitivity probes. They were the last untyped lab support modules used by App
and the notebook/exploration panels.

## What Changes

- Convert `lab/parameters.js` to `.ts` with typed parameter refs.
- Convert `lab/workspace.js` to `.ts` with a typed notebook host.
- Convert `lab/parametricSummary.js` to `.ts` with typed summary rows.
- Convert `lab/diff.js` and `lab/hash.js` to `.ts`.
- Convert `lab/sensitivity.js` to `.ts` with typed probes/results.
- Keep the JS compatibility re-exports and point internal imports at `.ts`.

## Out of Scope

- `lab/notebook.js`, `lab/descriptor.js`, `lab/exploration.js`,
  `lab/evolution.js`.
- Changing sensitivity, diffs, hashing or workspace behavior.
