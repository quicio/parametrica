## Why

The inspector exposes 19 expanded sections at once. Model parameters,
view controls, exploration tools and persistence actions compete for the same
scroll, and users cannot tell whether a control applies to the active layer,
the current generator, a disabled operator or an active timeline track.

## What Changes

- Add four workspace modes: Form, Look, Explore, Keep.
- Make every panel section an accessible accordion; persist mode and open
  sections in localStorage.
- Split generator parameters into essential and advanced groups.
- Add a compact context status: active layer, visibility, generator,
  operators, modulation, timeline tracks and projection.
- Add a hidden-layer warning with a direct Show action.
- Keep section-specific widgets and schemas unchanged.

## Capabilities

### New Capabilities

- `panel-modes`: workspace modes and persisted accordions.
- `progressive-parameters`: essential/advanced parameter disclosure.
- `context-status`: active-layer/operator/timeline status and hidden warnings.

### Modified Capabilities

- None. The document schema and parameter semantics are unchanged.

## Impact

- `src/ui/Controls.js`, `style.css`
- e2e helpers/tests; no core math changes
- docs

## Non-goals

- No new parameter schema fields or document migration.
- No redesign of individual widgets (harmonics, timeline, notebook).
- No drag-and-drop panel layout.
- No bilingual UI switch.
