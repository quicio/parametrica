## Types

- `ImageDataLike`, `Point`, `Harmonic`, `TraceOptions`, `TraceResult`,
  `TraceContoursResult`, `ContourEntry`, `ComponentEntry`.
- `CreateAppOptions` and the typed `createApp(): App` boundary.
- Entry globals are narrowed through `Record<string, unknown>`.

## Rules

- Tracing thresholds, budgets and Fourier output are unchanged.
- Composition still constructs concrete adapters and services.
- The browser entry remains side-effect based.

## Verification

- `tsc --noEmit`, Node, arch and e2e gates pass.
- Tracing, boot, composition and Pages deployment are unchanged.
