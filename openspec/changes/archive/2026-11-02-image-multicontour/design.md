## Context

`traceImageData()` already implements the full pipeline for one connected
component. The missing part is component enumeration and a multi-layer apply.

## Decisions

### D1: Reuse the single-component pipeline

The multi-contour path uses the same `traceBoundary`, `simplifyRDP`,
`resampleClosed` and `contourToFourier` functions. A shared
`traceComponent()` helper prevents two divergent tracers.

### D2: Bounded selection

Components are sorted by area. `maxContours` defaults to 12 (max 12), and
components smaller than `max(8, foreground * 0.0005)` are ignored. This keeps
the result editable and avoids filling the layer cap with noise.

### D3: Multi-layer apply

`buildFourierDocuments()` creates the first Fourier document with the existing
builder and appends one `createLayer('fourier', …)` per extra contour. Active
layer is 0, aliases are attached, and no image data is serialized.

### D4: Default preserves existing behavior

The **All contours** toggle is off by default. Existing e2e/unit flows still
exercise largest-contour tracing and apply one Fourier document.

## Risks / Trade-offs

- Multiple layers increase panel/render load; capped at 12.
- Only external silhouettes are traced. Holes/nested background components are
  not represented; that remains a separate feature.
- The preview shows all reconstructions with shared styling; per-contour colors
  are not part of this slice.

## Open Questions

- Should holes become contour layers with even-odd fill later?
- Should contour selection allow clicking individual components?
