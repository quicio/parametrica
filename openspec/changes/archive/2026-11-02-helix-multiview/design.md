## Context

`P5Adapter` currently builds one `RenderScene` from the active projection and
draws it inside the artboard. `buildRenderScene` can project layer curves from
their world metadata; the orthographic projection helpers already exist.

## Decisions

### D1: Document layout state

Add `view.layout` with `single` (default) and `quad`. It is sanitized and
backward compatible; old documents load as single.

### D2: Four panels

Quad layout divides the artboard into 2×2 panels with a small gap:

```txt
3D          XY · Planta
XZ · Alzado YZ · Perfil
```

Each panel builds a scene with `projectionOverride` (`3d`, `xy`, `xz`, `yz`).
The shared camera/document remains; only the projection differs.

### D3: Panel rendering

For each panel:
- build a scene with the projection override;
- compute panel analysis (`analyzeAll`);
- clip to the panel rect;
- translate to the panel centre and scale to fit;
- call the same `drawSceneContent` pass loop;
- draw a subtle border and label.

Guides/underlay are skipped in quad to avoid a global overlay crossing panels.
PNG/GIF capture the quad canvas as drawn.

### D4: Export boundary

Faithful SVG and plotter exports remain single-projection artifacts. When
`layout === 'quad'`, `unsupportedSvgFeatures` reports “Quad view layout
(canvas-only)” so the SVG notice is truthful. PNG/GIF are the recommended
artifacts for the quad composition.

### D5: Spatial gating

The Layout control is disabled for 2D documents and the renderer falls back to
single. `view.layout` is forced to `single` when the active generator has no
spatial capability.

## Risks / Trade-offs

- Four scenes per frame increase render cost; panel analysis is recomputed per
  panel. Typical Helix documents remain small.
- Quad is a canvas composition, not a new scene format. Exports are explicitly
  scoped as above.
- Panel labels sit inside the artboard; masthead overlap is possible on very
  short canvases.

## Open Questions

- Should a later version export a quad SVG/plotter sheet?
- Should panels be user-arrangeable?
