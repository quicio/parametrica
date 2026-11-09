## Render port

```js
{
  renderNow(),
  artboardDataURL(),
  currentCoordinateReadout(),
  setCoordinatePin(readout),
  clearCoordinatePin(),
  coordinatePinReadout(),
  thumbnailDataURL(width, timeout),
  quadActive,
}
```

Timeline, Advisor, Look coordinates and Surface Inspector receive this port.
`AdvisorPanel` stores it as `renderPort` because it already has a `render()`
method.

## Notebook port

```js
{
  controls,
  dialogs,
  document,
  importNotebook(...),
  notebook,
  notebookWorkspace,
  restoreCheckpoint(...),
  saveCheckpoint(...),
}
```

`NotebookPanel` receives this object as its `app`; no other App member is
available.

## Verification

- Renderer-dependent panels contain no `this.app.renderer` or
  `controls.app.renderer`.
- Every `app.*` use in NotebookPanel is in `NOTEBOOK_PORT`.
- All advisor, timeline, notebook and e2e suites pass.
