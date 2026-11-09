## 1. Ports

- [x] 1.1 Add `RENDER_PORT` and `createRenderPort`.
- [x] 1.2 Add `NOTEBOOK_PORT` and `createNotebookPort`.
- [x] 1.3 Inject both through `Controls`.
- [x] 1.4 Move Timeline, Advisor, Look and Surface Inspector to the render port.
- [x] 1.5 Move NotebookPanel to the notebook port.
- [x] 1.6 Add boundary checks.

## 2. Verification

- [x] 2.1 Run Node and e2e gates.
- [x] 2.2 Archive and release.

## Acceptance criteria

- Renderer panels use only the render port.
- NotebookPanel uses only the notebook port.
- No panel behavior changes.
