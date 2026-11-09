## Why

Preset and laboratory panels still reached through the broad UI surface. Their
needs are distinct: preset browsing/saving and analysis/explore/evolution.

## What Changes

- Add `PRESET_PORT` / `createPresetPort`.
- Add `LAB_PORT` / `createLabPort`.
- Inject both through `Controls`.
- Move PresetPanel and the preset save/delete controls to the preset port.
- Move LabPanel, ExplorePanel and EvolutionPanel to the lab port.
- Add dynamic boundary checks for every `app.*` use in those panels.

## Out of Scope

- A general DocumentPort or view models.
- Typing the ports.
- Changing panel behavior.
