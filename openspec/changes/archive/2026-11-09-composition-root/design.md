## Composition contract

`createApp` owns:

- persistence, session, presets, notebook, look store, dialogs and mutator;
- `renderPresetPreview` and the start-with preview size;
- factories for the overlays, P5 renderer, Exporter, Controls and Start With.

`App` receives:

```js
new App({ canvasContainer, telemetryEl, services, adapters })
```

It may call the factories, but it may not import concrete adapter classes or
localStorage stores.

## Ordering

The migration runs before `PresetManager`. The session store is created before
`App` so the first document can be restored. The notebook is created before the
notebook workspace and passed in.

## Verification

- `test/domains/architecture-boundaries.test.mjs` rejects concrete adapter
  imports in `App`.
- Node and Playwright suites must pass unchanged.
