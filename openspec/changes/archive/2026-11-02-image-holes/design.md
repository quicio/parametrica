## Context

The multi-contour path labels foreground components. Holes are background
components fully enclosed by a foreground component.

## Decisions

### D1: Hole detection

Invert the padded mask, label background components, and discard any component
touching the padded border. Remaining components are internal holes. They use
the same `traceComponent()` pipeline and are appended after foreground contours
with `hole: true`.

### D2: Bounds and status

Holes share the same `maxContours` budget and area threshold. The result reports
`holeCount`; the Image status includes the count. The largest-contour default
does not use hole detection.

### D3: Apply

`buildFourierDocuments()` creates a named layer per contour, using a “hole”
name suffix for internal contours. Holes are editable Fourier curves like any
other contour.

### D4: Explicit fill limitation

Holes are outlines, not punched even-odd fills. The document can stroke them and
export them, but filling a silhouette with holes requires a separate compound
fill feature.

## Risks / Trade-offs

- Internal background components include only fully enclosed regions; nested
  hierarchy is not represented.
- Hole contours share the 12-layer cap; very complex images may drop holes.
- The name “hole” is explicit so users understand the current semantics.

## Open Questions

- Add even-odd compound fill later?
- Expose contour nesting/order in the UI?
