## Context

New documents currently inherit stroke width 1 from `DEFAULT_STYLE`,
`createDefaultView` and exporter fallbacks. The Start With previews and the
surface views read better with a thinner default.

## Decisions

### D1: Default is 0.5

Set:

- `DEFAULT_STYLE.stroke.width = 0.5`
- `view.strokeWeight = 0.5`
- `sanitizeStyle` fallback `0.5`
- exporter fallback `0.5`

### D2: Stored widths win

Any document, preset, session or notebook that stores a width keeps it. No
migration rewrites existing values.

### D3: Explicit preset widths

Presets may still set their own width. Vortex Stack keeps its documented
instance width of 1.

## Risks / Trade-offs

- Existing sessions created before this change keep width 1; only new documents
  and presets without an explicit width use 0.5.
- Some visual snapshots may change slightly for new documents.
