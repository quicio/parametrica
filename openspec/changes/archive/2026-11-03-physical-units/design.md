## Context

`ViewTransform` maps world to abstract artboard units. Exporters use artboard
units without physical meaning. STL needs world vertices scaled to millimetres;
plotter/SVG needs a physical page size. These are separate consumers and must
not contaminate canonical world geometry.

## Decisions

### D1: Optional unit metadata

Add `view.units` with:

```text
{
  world: 'unitless' | 'mm' | 'cm',
  mmPerWorldUnit: number | null,
  artboard: 'unitless' | 'mm' | 'cm',
  mmPerArtboardUnit: number | null,
}
```

Missing metadata means `unitless`; no physical claim is made. Values are finite
and positive when physically enabled. `unitless` factors are null.

### D2: Geometry is never rescaled

Physical conversion happens at display/export boundaries. Canonical `W`
geometry, tessellation, SurfaceMapping, frame and bbox remain unchanged.

### D3: Explicit conversion

World-to-mm uses `mmPerWorldUnit`; artboard-to-mm uses
`mmPerArtboardUnit`. The two are independent. No implicit `1 world unit = 1 mm`.

### D4: Export behavior

- Unitless plotter stays unchanged.
- Physical plotter emits physical `width`/`height` or documented units while
  keeping the artboard viewBox.
- Fabrication export requires a physical world scale before claiming mm.
- Invalid/incomplete units produce a validation error, not a guess.

### D5: UI

Expose unit mode and scale in Look/Canvas or a dedicated Scale section. Show
computed physical bounds. Changing units never changes the artwork frame.

## Risks / Trade-offs

- Two scales can confuse users; labels must distinguish world scale from page
  scale.
- Existing exports remain unitless unless explicitly configured.
- Physical dimensions depend on tessellation for meshes but not on view.
- Fabrication export still needs Phase 4C.

## Open Questions

- Should units live on the document or on each export preset?
- Should artboard width/height be stored in mm instead of abstract units?
- Should physical scale be part of the layer or the whole document?
