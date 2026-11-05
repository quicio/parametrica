## Context

Built-in looks are view-level recipes. `view.modes`, `view.overlays`,
`view.colorMetric`, `view.guides` and `view.passOpacity` are already
serializable and sanitized.

## Decisions

### D1: Stored fields

A user look stores only:

```text
id, name, modes, overlays, colorMetric, guides, passOpacity
```

No generator, geometry, style, units, camera, artboard or fabrication state.

### D2: Storage

LocalStorage key `parametrica.looks.v1`, versioned. Names are unique among user
looks; built-in names are reserved. Corrupt entries are dropped.

### D3: UI

In Look → Looks:

- built-in grid remains;
- a compact name field + Save action;
- user looks list with Apply/Delete;
- overwrite asks for confirmation;
- no modal; no new workspace.

### D4: Availability

A user look applies even when some passes are inapplicable. Existing N/A
behavior remains; configured modes are preserved.

### D5: Isolation

Applying a look never mutates geometry, style, units, camera or fabrication.

## Risks / Trade-offs

- Local-only storage; no sync.
- User looks can reference passes not available for the active layer.
- Name collisions with built-ins must be rejected.
