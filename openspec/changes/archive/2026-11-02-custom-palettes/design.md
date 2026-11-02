## Context

`PALETTES` is a static curated list. The Style palette selector applies
background, stroke and fill to explicit document values.

## Decisions

### D1: Local store

`PaletteStore` loads/saves an array under `parametrica.palettes.v1`. It injects
storage for Node tests and sanitizes id/name/color fields. Built-ins are added
to `entries()` on read and never persisted.

### D2: Save semantics

Save captures the current artboard background and active-layer stroke/fill
colors. A case-insensitive name match replaces the existing custom entry and
keeps its id; otherwise a new id is created. The store caps at 24 entries.

### D3: Apply and delete

Applying a custom palette writes the same explicit values as a built-in.
Delete is only enabled for custom entries; removing one refreshes the select
and falls back to the first available palette.

### D4: Independence

Custom palettes do not read or write `view.colorRamp` or `view.colorMetric`.
They do not alter presets, documents or notebook storage.

## Risks / Trade-offs

- localStorage may be unavailable; the store keeps in-memory entries and
  reports `lastError`.
- Palette names are the replacement key; users cannot keep two same-name
  palettes.
- No migration needed; malformed storage is ignored.

## Open Questions

- Should custom palettes support import/export?
- Should fill-gradient colors be part of a palette?
