## Context

`view.passOpacity` already exists. Passes read `view.style`/layer style. A
minimal per-pass override needs to be explicit and opt-in.

## Decisions

### D1: Data model

```text
view.passStyle = {
  [passId]: {
    color: string | null,
    width: number | null
  }
}
```

`null` means inherit. Values are sanitized (color hex, width 0.1–40). Missing
metadata means no overrides.

### D2: Support

Only passes that declare stroke appearance support color/width. Raster/field
passes (signed distance, gradient) may expose width/color as no-ops; the UI
disables unsupported controls with a reason.

### D3: Rendering

Render context resolves:

```text
color = passStyle.color ?? layerStyle.stroke.color
width = passStyle.width ?? layerStyle.stroke.width
```

Pass math and ordering remain unchanged.

### D4: Exports

- SVG uses the resolved pass style for stroke-bearing passes.
- PNG inherits the canvas rendering.
- STL ignores pass style.

### D5: UI

Render row gets a compact color input and width number, disabled when the pass
is off/inapplicable/unsupported. Reset per pass. No new section.

## Risks / Trade-offs

- More controls in Render; use a disclosure or compact row.
- Some passes ignore color/width; UI must explain.
- Overrides can make SVG differ from previous snapshots; defaults unchanged.
