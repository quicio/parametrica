## Why

LOOK Phase 1 separated camera, canvas, style, render and overlays, but left
Image, Animation and Timeline under a temporary **Work** group. That group is
still a mixed toolbox: Image is an input/ingest workflow, while Animation and
Timeline are time/performance tools. The temporary label has done its job.

The product decision is now explicit:

- **Ingest** owns Image and incorporation/tracing.
- **Perform** owns Animation, Timeline and temporal export.
- **Keep** remains the place for conserving and exporting final results.
- **LOOK** becomes appearance/viewport only.

## What Changes

- Add two inspector modes: **Ingest** and **Perform**.
- Move the existing Image section to Ingest.
- Move the existing Animation and Timeline sections to Perform.
- Keep frame-sequence and GIF export with Timeline in Perform; do not
  duplicate them in Keep.
- Remove the temporary **Work · temporary** group and its label machinery.
- Update the mode bar layout for six modes.
- Migrate persisted UI state without losing valid modes or section state.
- Update the LOOK/panel mode specs, e2e coverage, audit and docs.

This is a navigation-only change. It does not add tracing, animation,
timeline, export or document capabilities.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `panel-modes`: exposes Form, Look, Explore, Perform, Ingest and Keep.
- `look-workspace`: LOOK no longer owns ingest/time tools; Ingest and Perform
  own them.

## Impact

- `src/ui/Controls.js`: mode list, section modes, build order, Work removal,
  UI-state migration.
- `style.css`: six-column mode bar.
- `e2e/look.spec.js`, `e2e/panel.spec.js`, `e2e/ui.spec.js`: mode and
  relocation coverage.
- `docs/audit-product-navigation.md`, README, SPEC, architecture,
  `openspec/specs/panel-modes`, `openspec/specs/look-workspace`.
- No document, preset, notebook or session format change.

## Non-goals

- No new image tracing, animation, timeline or export feature.
- No move of frame/GIF export to Keep; they remain with Timeline in Perform.
- No change to LOOK Phase 1 decisions: `view.style` alias, independent
  color ramp, active-layer projection gating, Camera Reset via history.
- No fill gradients, per-pass settings, per-layer render modes, SVG parity,
  Notebook/Presets unification or MAKE.
