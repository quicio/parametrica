## Why

Evolution is the last lab widget: it breeds checkpoint parents, previews
children and keeps the selected ones.

## What Changes

- Convert `ui/widgets/EvolutionPanel.js` to `.ts`.
- Type checkpoints, children, evaluations, app ports and DOM state.
- Point the lab-port architecture check at the typed module.
- Keep the JS compatibility re-export.

## Out of Scope

- Notebook/Preset panels, sections and Controls.
