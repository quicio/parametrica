## Why

The preset panel is the visual library with lazy previews, favorites and
recent filtering.

## What Changes

- Convert `ui/widgets/PresetPanel.js` to `.ts`.
- Type preset entries/categories, the preset port, filter state and previews.
- Point the preset-port architecture check at the typed module.
- Keep the JS compatibility re-export.

## Out of Scope

- Notebook, Timeline and remaining panels.
