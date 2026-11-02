## Context

`style.fill` is `{ enabled, color, opacity }`. Closed curves get a solid fill in
the stroke pass; Surface Fill uses the same fill or a stroke-derived fallback.
SVG now replays passes through `SvgContext`, so a gradient must work in both
the p5 context and the SVG recorder.

## Model

```js
fill: {
  enabled: true,
  color: '#ffffff',
  opacity: 1,
  gradient: {
    enabled: false,
    type: 'linear',       // 'linear' | 'radial'
    angle: 0,             // degrees; 0 = left→right
    centerX: 0.5,         // 0..1 within the layer bbox
    centerY: 0.5,
    radius: 0.75,         // fraction of the larger bbox side
    colors: ['#ffffff', '#000000'] // 2–4 hex stops
  }
}
```

`sanitizeFillGradient` clamps values and falls back to a 2-stop default. Missing
gradient state means `enabled: false`, preserving existing documents.

## Geometry

- Linear: endpoints span the layer bbox along `angle`, using the bbox diagonal
  projection so the gradient covers the whole silhouette.
- Radial: center is relative to the layer bbox; radius scales with the larger
  bbox side.
- Fill opacity is applied to the fill only; strokes keep their own opacity.
- Solid fill remains the default. Gradient authoring is active-layer only.

## Rendering

- `src/render/fill.js` resolves the gradient and applies it to:
  - the stroke pass for closed, non-depth-faded curves;
  - Surface Fill faces.
- p5 uses `drawingContext.createLinearGradient/createRadialGradient`.
- Surface Fill reuses one gradient and varies per-face depth alpha.
- SVG recorder emits `<defs>` with `gradientUnits="userSpaceOnUse"` and fills
  paths via `url(#…)`.
- Gradient Wireframe is unchanged.

## UI

Style gains:

- Fill type: Solid / Linear / Radial.
- Angle (linear).
- Center X/Y and Radius (radial).
- 2–4 gradient colors, add/remove, with Fill opacity shared.

Selecting a gradient type turns Fill on; selecting Solid disables the gradient
but leaves the solid color intact. Content lock disables the controls.

## Risks / Trade-offs

- Gradient coordinates are layer-bbox based, not artboard-global. This keeps
  multi-layer fills independent and predictable.
- Canvas gradient alpha is baked into color stops; per-face depth alpha uses
  context alpha only for Surface Fill.
- CSS/SVG gradient consumer support is broad; PNG remains the raster fallback.
- SVG definition IDs are namespaced per layer/pass to avoid collisions.

## Open Questions

- Should a later version expose artboard-global gradients or gradient strokes?
- Should fill gradient stops accept offsets instead of even spacing?
