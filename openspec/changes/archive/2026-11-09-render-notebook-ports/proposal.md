## Why

The Fabricate panel now has a narrow port, but renderer access and Notebook
access still go through the broad `UI_SURFACE`. Timeline, Advisor, Look
coordinates and the Surface Inspector need five renderer operations; Notebook
needs eight application members.

## What Changes

- Add `RENDER_PORT` / `createRenderPort`.
- Add `NOTEBOOK_PORT` / `createNotebookPort`.
- Inject both through `Controls`.
- Move Timeline, Advisor, Look coordinate pinning and Surface Inspector to the
  render port.
- Move `NotebookPanel` to the notebook port.
- Add boundary checks for both ports.

## Out of Scope

- Splitting Preset or Document ports.
- Typing the ports.
- Changing panel behavior.
