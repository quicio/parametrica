## Context

`buildFabricationReport` is synchronous and called on every Fabricate refresh.
With Manifold and SDF repair, it can block the main thread. The report is also
the source for STL/3MF export.

## Decisions

### D1: Heavy vs light

Heavy jobs:

- boolean recipe != none;
- repair enabled;
- self-intersection strategy != none;
- explicit manifold/SDF where relevant.

Light jobs run synchronously:

- no boolean;
- no repair;
- no self-intersection resolution;
- single/multi-body selection only.

### D2: Worker protocol

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

Worker input is the serializable fabrication input:
`{ evaluation, layerIndex, units, preparation }`.

### D3: Controller

`FabricationJobs`:

- lazily creates one Worker;
- debounces runs;
- cancels by terminating the worker;
- exposes `run`, `cancel`, `dispose`;
- falls back to synchronous `buildFabricationReport` if `Worker` is absent.

### D4: UI

Fabricate adds:

- `WORKING · <phase>` status;
- a progress row/percentage;
- a Cancel button;
- export disabled while running.

When the result arrives, the normal report is rendered and export is enabled.
If the job fails, the reason is shown and export stays disabled.

### D5: Export

`Exporter` uses the cached completed report when available. If none exists and
the request is light, it computes synchronously. If a heavy job is still
running, export is rejected with a clear message.

### D6: Determinism

The worker calls the same pure functions as the main thread. Geometry and
serialization are deterministic. Cancellation discards the job; no partial
result is used.

## Test matrix

- Heavy boolean and SDF jobs complete in the worker.
- Progress phases are emitted.
- Cancel stops the job and leaves export disabled.
- Light jobs stay synchronous.
- Export uses the completed report.
- Fallback runs when Worker is unavailable.
- E2E: WORKING → READY, Cancel, export.
