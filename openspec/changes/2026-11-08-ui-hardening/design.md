## Layout contract

- Below 900px the stage stacks: canvas 45vh, rail 55vh, rail scrolls.
- Canvas min-height may not push the rail outside the viewport.
- No horizontal overflow at 720x450 or 900x600.
- Mode rail stays one line when it fits; the current 400-440px rail is desktop.
- Short viewports hide masthead subtitle/doctrine and telemetry.

## Accessibility contract

- Modes use a tablist with roving tabindex and Arrow/Home/End.
- One tabpanel (`#panel-sections-region`) is labelled by the active tab.
- Layer rows are keyboard-selectable; actions have accessible names.
- Focus is a white outline with offset, distinct from the red active state.
- Functional text is 11px+ and meets AA contrast.
- `prefers-reduced-motion` disables decorative animation.

## Responsive policy

Desktop is the primary target. Tablet-width layouts are supported through the
stacked stage. Phone-sized layouts remain usable but are not a product target.

## Acceptance

- 200% zoom test passes with no page-level overflow.
- Mode bar height stays under 50px at desktop and 720px.
- Keyboard-only flow can select a layer and switch modes.
- Reduced-motion media query removes animation.
