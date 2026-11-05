## Context

Preset previews are generated at `PREVIEW_SIZE = 96`. Start With displays them
in a 160 px thumbnail, which is visibly upscaled for dense compositions.

## Decisions

### D1: Dedicated Start With preview size

Use a 224 px preview for Start With cards. The preset browser keeps 96 px.

### D2: Size-aware cache

Preview cache identity includes size and profile version:

```text
previewKey(document, { size })
```

The existing preset preview cache remains 96 px. Start With caches its larger
preview separately.

### D3: No new evaluator

Reuse `evaluateDocument` + `curvesDataURL` with a larger profile. No composition
renderer or network path is added.

### D4: Fallback

If the larger preview fails, show the existing placeholder. The card remains
selectable.

### D5: Card geometry

All Start With cards keep equal width and preview height. The larger preview
must use `object-fit: contain` and not change card dimensions.

## Risks / Trade-offs

- Larger previews cost more at startup; generate after the first paint.
- Dense compositions may still be visually busy; use the wireframe thumbnail
  already used by presets, not a new aesthetic.
- Cache key changes invalidate old previews.

## Open Questions

- Should the preset browser also offer a larger optional preview later?
