## Context

`composition-model` defines the long-term `LayerStyle` and artboard. This
slice implements a **single-layer v2 subset** in `view`, so current documents
keep loading and `composition-layers` can later map it to a layer.

## Decisions

### D1: Artboard shape

```text
view.artboard = {
  width: number,       // 240..4096
  height: number,      // 240..4096
  background: string,  // #rgb/#rrggbb
  margin: number       // 0..120
}
```

Defaults: `{width: 900, height: 900, background: '#000000', margin: 0}`.
Presets: square, portrait 4:5, landscape 16:9, A4 portrait, A4 landscape.

### D2: Single-layer style

```text
view.style = {
  stroke: { color, width, opacity, cap, join },
  fill:   { enabled, color, opacity },
  blend:  'normal' | 'multiply' | 'screen' | 'difference'
}
```

Defaults preserve today's look: white stroke, width from `view.strokeWeight`,
opacity 1, butt/round caps, no fill, normal blend.

`view.strokeWeight` remains for compatibility; the renderer uses
`view.style.stroke.width` when present and synchronizes the old field on save.

### D3: Renderer

- The p5 canvas is sized by the artboard aspect and letterboxed inside the
  container.
- The drawing origin is the artboard center; margin insets the composition
  guide but does not scale geometry.
- Background is filled from `view.artboard.background`.
- Stroke and optional fill use `view.style`.

### D4: Export

SVG:

- `viewBox` and width/height follow the artboard.
- Background `<rect>` uses artboard background.
- Path group uses stroke color/width/opacity/cap/join and optional fill.
- Guides and diagnostic overlays are not exported.

PNG uses the rendered canvas at HiDPI scale, including background and style.

### D5: Palettes

A small curated palette list supplies stroke/background pairs. Palettes are
data, not themes: applying one writes values into `view.style`/`view.artboard`
so the document remains self-contained.

### D6: Migration

Documents without `view.artboard`/`view.style` receive the defaults. Built-in
presets keep their current visual output at migration time.

## Risks

- Letterboxing changes mouse/camera math; tests must cover camera drag and
  3D projection with portrait/landscape artboards.
- SVG and canvas must agree on stroke opacity and line caps.
- `view.strokeWeight` and `view.style.stroke.width` can diverge; sanitizer
  resolves the conflict deterministically (style wins).
