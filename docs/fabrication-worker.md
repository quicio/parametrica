# Fabrication worker

Heavy fabrication jobs run in a module Web Worker so Manifold CSG, repair and
SDF reconstruction do not freeze the UI.

## Heavy vs light

Heavy:

- boolean recipe != none;
- Repair enabled;
- self-intersection repair != none.

Light (synchronous):

- single/multi-body selection only;
- no repair/boolean/SDF.

## Worker protocol

Main → worker:

```js
{ type: 'run', id, input }
```

Worker → main:

```js
{ type: 'progress', id, phase, value }
{ type: 'result', id, report }
{ type: 'error', id, message }
```

`input` is `{ evaluation, layerIndex, units, preparation }`; all plain data.

## Controller

`src/application/fabricationJobs.js`:

- lazily creates one module Worker;
- debounces changes (180 ms);
- cancels a running job by terminating the worker;
- forwards progress/results/errors;
- falls back to synchronous `buildFabricationReport` when Workers are absent.

## Progress phases

- `engine` — initialize Manifold in the worker;
- `preparing` — repair/preparation;
- `boolean` — Manifold boolean;
- `sdf` — SDF/level set;
- `done` — result ready.

Manifold booleans do not expose fine-grained internal progress; phase-level
progress is shown.

## UI

While a job runs:

- status: `WORKING · <phase>`;
- progress row with percentage;
- **Cancel** button;
- export disabled.

On completion the normal report renders and export is enabled. Cancel shows
`CANCELLED` and leaves export disabled.

## Export

`Exporter` uses `controls.fabricationReport` when a completed report exists, so
STL/3MF export does not recompute heavy geometry on the main thread. If no cached
report exists, it falls back to a synchronous report (useful for tests and
headless paths).

## Determinism

The worker calls the same pure functions as the main thread. Manifold and SDF
outputs remain deterministic. Cancellation discards the job; no partial result is
used.

## Limits

- One worker; no pool.
- Structured-clone cost for large meshes.
- No streaming/partial geometry.
- Terminating a worker restarts Manifold initialization for the next job.
- Worker failure surfaces as a Fabricate error.
