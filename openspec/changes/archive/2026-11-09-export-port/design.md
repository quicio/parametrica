## Export port

```js
{
  getDocument(),
  getEvaluation(),
  rendererSize(),
  artboardDataURL(),
  saveCanvas(name),
  renderNow(),
  artboardImageData(maxSize),
  getFabricationReport(),
  productPreviewCapture(),
  notify(message, kind),
  setTime(time),
  serializeDocument(name, document),
}
```

Composition binds these closures to the app after construction. `Exporter` no
longer contains `this.app` and never imports `application/App`.

The constructor also accepts the legacy `{ document, evaluation, renderer,
notify }` fixture shape used by unit tests; it is normalized to the port shape.
That path is for tests only, not composition.

## Verification

- Text boundary test rejects `this.app` and App imports in `Exporter`.
- Existing export, Quad, STL/3MF, PNG/GIF and e2e tests must pass.
