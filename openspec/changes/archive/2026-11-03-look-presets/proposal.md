## Why

Look is the appearance workspace, but it still asks users to assemble common
visualizations pass by pass. The Render section also exposes two controls per
pass: a checkbox and an opacity slider whose red thumb reads like a second
switch. Some passes disable themselves when the active geometry does not
support them, but the UI only explains this in a tooltip.

Users need named starting points (default visualizations) and a clear contract:
what enables a control, what only adjusts its strength, and why a control is
unavailable for the current layer.

## What Changes

- Add a **Looks** section with built-in visual presets:
  Line, Technical, Surface, Gradient, Diagnostic and Field.
- Apply presets to view-level settings only: passes, overlays, color metric and
  guides. Never mutate geometry, styles, units or fabrication state.
- Add Reset to the default line look.
- Make the Render pass row explicit:
  checkbox = enable/disable, opacity = secondary strength control;
  opacity is labeled and only active when the pass is on.
- Show an applicability reason and `N/A` state for unavailable passes.
- Preserve configured passes when they become temporarily inapplicable instead
  of deleting them from `view.modes`.
- Disable no-op controls with reasons:
  surface-only Canvas toggles on non-surface layers;
  Coordinates controls on non-spatial layers.
- Keep compatibility with existing documents and render exports.

## Capabilities

### New Capabilities

- `look-presets`: built-in visual recipes and reset behavior.

### Modified Capabilities

- `look-workspace`: render-pass control semantics and applicability visibility.

## Impact

- New pure look-preset definitions and application helper.
- Controls: Looks section, Render rows, Canvas/Coordinates applicability.
- CSS for pass rows, reasons and preset buttons.
- Tests: preset definitions/application, e2e pass semantics, preset switching,
  unavailable states and preserved modes.
- No renderer pass math, geometry, export, units or fabrication change.

## Non-goals

- No new render pass.
- No per-layer render modes or per-pass color/size settings.
- No document geometry or style preset.
- No automatic generator switching.
- No export changes.
