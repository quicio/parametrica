## Why

Notebook is the checkpoint workspace: project/series organization, metadata,
A/B comparison and import/export.

## What Changes

- Convert `ui/widgets/NotebookPanel.js` to `.ts`.
- Type checkpoints, projects, series, comparisons, dialogs and app ports.
- Point the notebook-port architecture check at the typed module.
- Keep the JS compatibility re-export.

## Out of Scope

- Timeline/Image/Advisor panels, sections and Controls.
