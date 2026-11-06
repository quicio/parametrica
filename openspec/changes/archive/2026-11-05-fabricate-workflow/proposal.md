## Why

Fabricate now exposes scope, boolean, CSG strategy, preparation, repair,
topology, self-intersections, resolution, units and format in one long list.
Users cannot see what will happen or why export is blocked. The engine is
capable; the workflow is not.

## What Changes

- Group controls into Source, Repair, Combine, Output and Checks.
- Add a plain-language Plan summary before the controls.
- Add Draft/Standard/High quality presets mapping to repair resolution.
- Show a suggested resolution from the active geometry bbox.
- Add a Next action line when export is blocked.
- Keep all existing controls, classes and behavior.
- No geometry, document, worker or export algorithm change.

## Capabilities

### New Capabilities

- `fabricate-workflow`: grouped Fabricate UX, plan, presets and next action.

### Modified Capabilities

- `make-workspace`: guided Fabricate presentation.

## Impact

- Fabricate section markup
- Controls render logic
- E2E/docs

## Non-goals

- No wizard/multi-step navigation.
- No new geometry options.
- No visual redesign outside Fabricate.
- No change to validation, CSG or export.
