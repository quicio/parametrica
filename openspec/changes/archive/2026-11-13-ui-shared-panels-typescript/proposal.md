## Why

These shared UI surfaces are imported by the canvas and by many panels; typing
them first reduces casts for the rest of the UI block.

## What Changes

- Convert `ui/SeamLegend.js`, `ui/ParametricOverlay.js`, `ui/dialogs.js`,
  `ui/widgets/HarmonicsEditor.js` and `ui/widgets/modeToggles.js` to `.ts`.
- Type overlay apps, legend statuses, dialog results and harmonic rows.
- Keep JS compatibility re-exports.

## Out of Scope

- Large panels and Controls.
