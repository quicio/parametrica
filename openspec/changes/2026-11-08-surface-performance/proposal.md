## Why

Picking, seam overlays and playback are tested for correctness, not measured at
dense surface sizes. A slow scene can make the instrument feel broken without a
clear failure.

## What Changes

- Add a browser benchmark for dense Surface scenes.
- Measure scene build, pick, seam overlay and playback frame.
- Define provisional budgets and a degrade path.
- Keep the technical renderer and geometry contracts unchanged.

## Out of Scope

- New renderer.
- Geometry simplification.
- Mobile-specific optimization.
