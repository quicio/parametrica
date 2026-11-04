## 1. Presets

- [x] 1.1 Add pure look-preset definitions and availability rules.
- [x] 1.2 Add apply/reset behavior limited to view-level fields.
- [x] 1.3 Add the Looks section with disabled reasons.
  - Verify: unit tests for definitions, availability and no geometry/style
    mutation; e2e apply/reset/preset availability.

## 2. Render controls

- [x] 2.1 Make checkbox the only on/off control and label opacity as secondary.
- [x] 2.2 Show `N/A` plus a reason for inapplicable passes.
- [x] 2.3 Preserve `view.modes` across temporary inapplicability.
  - Verify: e2e opacity state, percentage, reasons and mode preservation across
    generator changes.

## 3. Applicability

- [x] 3.1 Disable surface-only Canvas toggles with a reason on non-surface
      layers.
- [x] 3.2 Disable Coordinates controls with a reason on non-spatial layers.
  - Verify: e2e for 2D and surface layers, no-op controls never appear active.

## 4. Acceptance

- [x] 4.1 Document presets, control semantics and applicability.
- [x] 4.2 Run `npm run check`, `npm run test:e2e`, strict OpenSpec validation
      and archive.

## Acceptance criteria

- Built-in visual presets apply to the current view without changing geometry.
- Unavailable presets and passes explain why they are unavailable.
- Render rows have one unambiguous on/off control; opacity is clearly labeled.
- Configured passes survive a generator change that makes them inapplicable.
- No-op Canvas/Coordinates controls are visibly disabled with reasons.
- Existing render, export, units and fabrication behavior is unchanged.
