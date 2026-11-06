## Why

Manifold CSG and SDF self-intersection repair can take seconds and currently run
on the main thread. A 14-second Enneper SDF repair freezes the UI. Fabricate
also has no progress or cancellation. This slice moves heavy work off the main
thread.

## What Changes

- Add a module Web Worker for fabrication report/CSG/SDF jobs.
- Add a main-thread job controller with progress, cancellation and debounce.
- Keep lightweight fabrication reports synchronous.
- Cache the last completed heavy report and use it for STL/3MF export.
- Disable export while a job is running; expose phase/progress and Cancel.
- Fall back to synchronous execution when Workers are unavailable.
- Keep Manifold and SDF behavior unchanged.

## Capabilities

### New Capabilities

- `fabrication-worker`: worker job execution, progress, cancel and fallback.

### Modified Capabilities

- `make-workspace`: working state, progress and cancel.
- `fabrication-contracts`: export uses the completed job result.

## Impact

- `src/workers/fabricationWorker.js`
- `src/application/fabricationJobRunner.js`
- `src/application/fabricationJobs.js`
- Fabricate UI, Exporter, tests and docs

## Non-goals

- No geometry algorithm change.
- No multi-worker pool.
- No streaming/partial geometry.
- No 3MF/material changes.
