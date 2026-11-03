## Context

`#telemetry` is a fixed bottom-left validity/performance readout. The inspector
already contains editable parameters, but reading values while the panel is in
another mode requires switching back and forth.

## Decisions

### D1: Pure summary model

`buildParametricSummary(document, layerIndex)` resolves the active layer,
generator schema labels, formatted values, advanced flags, seed and enabled
operator names. It is DOM-free and tested in Node.

### D2: Edge overlay

`ParametricOverlay` renders a top-right `ƒ` button and a narrow, scrollable
panel with a red left rule. Advanced rows are dimmed. It is read-only and uses
the existing monospace/panel styling.

### D3: Visibility

Visibility is stored in `parametrica.parametrics.v1`, defaulting on. A canvas
button and the Canvas **Parametrics** checkbox both call
`App.setParametricsVisible`, keeping the two controls in sync.

### D4: Freshness

`App.evaluate()` calls `overlay.refresh()`, so parameter, layer, preset and
undo changes update the readout. Hidden overlays skip DOM work.

## Risks / Trade-offs

- Long parameter values are truncated; `title` carries the full value.
- The panel can cover the top-right artboard; it is toggleable and edge-bound.
- Advanced values are visible but dimmed; this avoids a second disclosure UI.
- On small screens the width/height are reduced.

## Open Questions

- Should parameter rows be clickable to focus their Form controls?
- Should expression values expand on hover?
