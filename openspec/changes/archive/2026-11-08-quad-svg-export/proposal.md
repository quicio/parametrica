## Why

Quad view is canvas-only. SVG/plotter always export the active projection, so a
piece composed in Quad cannot be reproduced faithfully.

## What Changes

- Define a Quad export layout.
- Reuse the same projected scenes per panel.
- Add panel labels/axes according to the existing view.
- Keep units and plotter scaling.
- Report unsupported overlays.

## Out of Scope

- New canvas layout.
- New camera.
- Changes to the Quad renderer.
