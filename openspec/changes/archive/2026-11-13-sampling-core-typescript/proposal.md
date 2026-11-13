## Why

Sampling defines how every generator walks its parameter domain. Its bbox and
resampling helpers are also consumed by operators, render and lab code.

## What Changes

- Convert `sampling/sampling.js` to `.ts`.
- Type adaptive intervals, heaps, split results, bboxes and fitting.
- Keep the JS compatibility re-export and adjust structural casts.

## Out of Scope

- Parametric sampling helpers.
