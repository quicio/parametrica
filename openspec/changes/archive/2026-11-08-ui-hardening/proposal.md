## Why

The UI now has a one-line mode rail, readable functional type and keyboard
navigation, but responsive and accessibility behaviour is not yet a formal
contract. At 200% zoom the stage can overflow; narrow viewports need a clear
layout; reduced motion and focus behaviour need regression coverage.

## What Changes

- Define a fixed stacked layout for narrow viewports.
- Require no horizontal overflow at 200% zoom.
- Keep the mode rail to one line where the viewport allows it.
- Require keyboard access to modes, layers and layer actions.
- Require visible focus distinct from the active state.
- Require reduced-motion handling.
- Define an explicit desktop-first/tablet-supported policy.
- Add e2e coverage for 720x450 and 900x600.

## Out of Scope

- Visual rebrand.
- New components or a new renderer.
- Native mobile app.
- Changes to geometry, export or fabrication.
