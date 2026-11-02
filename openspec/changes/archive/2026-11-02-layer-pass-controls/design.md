## Context

`view.modes` is the global pass list. `P5Adapter` draws each layer with that
list, and SVG pass export uses the same list. Passes hardcode their colors and
widths; opacity can be applied around the whole pass without changing each
pass implementation.

## Decisions

### D1: Layer override

`layer.modes` is `null` by default (inherit). A custom array replaces
`view.modes` for that layer only. The Style section exposes Global/Custom and
a checkbox list using the registry order. Empty custom means no passes; the
help text makes the state explicit.

### D2: Per-pass opacity

`view.passOpacity` is a map of pass id → 0..1. Missing means 1. p5 multiplies
the context `globalAlpha` around the pass and restores it in `finally`. SVG
adds `opacity` to the pass group. Opacity is global per pass, not per layer.

### D3: Analysis and applicability

Per-layer analysis is selected from the layer's effective modes. Existing
`appliesTo` behavior and global pass toggles remain. The Style override does
not hide applicabilities; passes still no-op when they cannot run.

### D4: Backward compatibility

Old documents have no `layer.modes` and an empty `passOpacity`; they behave
exactly as before. SVG warnings inspect effective per-layer modes.

## Risks / Trade-offs

- Custom mode lists can be empty; this is explicit and reversible.
- Pass opacity applies after pass-internal alpha, so the result is multiplicative.
- Per-pass color/width is intentionally deferred; the current pass APIs hardcode
  those values.
- Layer overrides increase UI surface in Style; grouped checkboxes keep it small.

## Open Questions

- Should per-pass color/width become overrides later?
- Should opacity become per-layer-per-pass?
