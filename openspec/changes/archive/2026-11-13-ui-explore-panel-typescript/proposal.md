## Why

Explore is the largest lab UI surface: it owns selection/locks/axis state and
renders strip, grid and morph candidates.

## What Changes

- Convert `ui/widgets/ExplorePanel.js` to `.ts`.
- Type candidates, refs, controls, app ports and DOM state.
- Point the lab-port architecture check at the typed module.
- Keep the JS compatibility re-export.

## Out of Scope

- Evolution, sections, Controls and remaining panels.
