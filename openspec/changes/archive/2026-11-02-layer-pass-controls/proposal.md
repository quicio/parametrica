## Why

Render modes are global and passes have no user-facing opacity. In a layered
composition, different layers often need different diagnostic/default passes,
and a diagnostic pass may need to be toned down without removing it.

## What Changes

- Add optional `layer.modes`: when present, that layer uses its own pass list;
  otherwise it inherits `view.modes`.
- Add `view.passOpacity` keyed by pass id, default absent/1.
- Add Style **Render passes** override (Global/Custom + checkboxes).
- Add a per-pass opacity slider in Render.
- Apply opacity in p5 (`globalAlpha`) and SVG (`<g opacity>`).
- Preserve global mode behavior and existing documents.
- Update tests, docs, audit and roadmap.

## Capabilities

### New Capabilities

- `layer-pass-controls`: per-layer mode overrides and per-pass opacity.

### Modified Capabilities

- None.

## Impact

- Modified: `src/core/document.js`, `src/core/engine.js`,
  `src/application/renderSceneBuilder.js`, `src/render/p5/P5Adapter.js`,
  `src/export/Exporter.js`, `src/ui/Controls.js`, `style.css`.
- Tests: `test/lab.smoke.mjs`, `e2e/hardening.spec.js`.
- Docs: README, SPEC, architecture, audit, roadmap.
- No document version bump.
- No per-pass color/width settings.

## Non-goals

- No per-pass color or stroke-width settings.
- No per-layer overlays.
- No new render pass.
- No change to the global Render defaults.
