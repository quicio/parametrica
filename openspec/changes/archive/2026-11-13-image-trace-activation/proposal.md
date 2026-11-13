## Why

The image tracing slice created `imageTrace.ts` but left the original
`imageTrace.js` implementation in place, so consumers and tests still ran the
untyped module. The typed module must be the single implementation.

## What Changes

- Replace `input/imageTrace.js` with a compatibility re-export.
- Keep `boundsOf` output identical to the JS implementation.
- Verify the image tracing unit and e2e suites against the typed module.

## Out of Scope

- Image tracing algorithms or UI changes.
