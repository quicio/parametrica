## Why

When exploring a strip, adopting a candidate rebuilt the entire inspector
panel. The scroll position jumped and focus fell back to the document, so the
user lost the family they were looking at. Randomizing could also reset the
horizontal strip position.

This is a focused UX fix for `explore-1d`: parameter-only candidate adoption
must preserve the editing context.

## What Changes

- Candidate adoption no longer rebuilds Controls when the generator and
  operator structure are unchanged.
- `App.adoptCandidate` merges candidate parameters into the existing stage
  objects and refreshes controller displays.
- Full panel rebuilds preserve `#ui` scroll and a tagged focus target.
- The Explore strip preserves horizontal scroll while regenerating previews.
- A regression e2e test locks scroll and focus behavior.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `lab-exploration-panel`: add a requirement that randomize/adoption preserve
  the inspector context (scroll, focus, candidate strip).

## Impact

- `src/core/App.js`, `src/ui/Controls.js`,
  `src/ui/widgets/ExplorePanel.js`, `e2e/ui.spec.js`.
- No schema, document or data migration.
- No new dependency.

## Non-goals

- No general session persistence.
- No undo/redo changes.
- No redesign of the inspector.
