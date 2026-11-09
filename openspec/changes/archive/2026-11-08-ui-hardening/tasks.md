## 1. Layout

- [x] 1.1 Stack the stage below 900px.
- [x] 1.2 Keep canvas and rail inside the viewport.
- [x] 1.3 Hide non-essential masthead/telemetry on short viewports.
- [x] 1.4 Keep the mode bar on one line.
- [x] 1.5 Decide whether phone-sized layouts are officially supported.

## 2. Accessibility

- [x] 2.1 Mode tablist with roving tabindex and arrows.
- [x] 2.2 Tabpanel semantics and aria-controls.
- [x] 2.3 Keyboard-selectable layer rows.
- [x] 2.4 Accessible names for layer actions.
- [x] 2.5 Focus distinct from active state.
- [x] 2.6 Reduced-motion handling.
- [x] 2.7 Run an accessibility-tree and keyboard pass (manual VoiceOver/NVDA remains recommended).

## 3. Verification

- [x] 3.1 E2E at 720x450.
- [x] 3.2 E2E mode bar height.
- [x] 3.3 Detector pass for undersized/contrast findings.
- [x] 3.4 Review 200% zoom on Chromium, Firefox and WebKit.
- [x] 3.5 Run full gates.

## Acceptance criteria

- No horizontal overflow at 720x450.
- Rail remains scrollable and inside the viewport.
- Mode bar stays one line where it fits.
- Keyboard users can switch modes and select layers.
- Reduced motion is respected.
- Existing presets and exports do not regress.
