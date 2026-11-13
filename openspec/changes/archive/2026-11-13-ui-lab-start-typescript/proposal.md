## Why

The lab panel and start-with chooser are the two remaining small app surfaces
that exercise the lab and start-with ports.

## What Changes

- Convert `ui/widgets/LabPanel.js` to `.ts`.
- Convert `ui/StartWithOverlay.js` to `.ts`.
- Type analysis results, sensitivity entries, choices, cards and focus flow.
- Point architecture port checks at the typed modules.
- Keep JS compatibility re-exports.

## Out of Scope

- Explore/Evolution, sections, Controls and remaining panels.
