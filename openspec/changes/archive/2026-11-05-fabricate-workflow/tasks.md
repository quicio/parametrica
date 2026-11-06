## 1. Markup

- [x] 1.1 Add plan, suggestion and next-action elements.
- [x] 1.2 Add Source/Repair/Combine/Output/Checks groups.
- [x] 1.3 Add quality preset selector.

## 2. Behavior

- [x] 2.1 Render plan from preparation/report.
- [x] 2.2 Map presets to resolution and Custom on manual edit.
- [x] 2.3 Derive suggested resolution from bbox.
- [x] 2.4 Derive next action from the first blocker.
- [x] 2.5 Keep existing controls and classes.

## 3. Tests and acceptance

- [x] 3.1 E2E groups/plan/preset/suggestion.
- [x] 3.2 Next action for units/open/ready.
- [x] 3.3 Existing Fabricate/worker/export tests green.
- [x] 3.4 Document and run full gates.

## Acceptance criteria

- Fabricate is grouped and scannable.
- Plan and next action are accurate.
- Presets set resolution; manual edits mark Custom.
- Suggestion is advisory only.
- No geometry/export behavior change.
