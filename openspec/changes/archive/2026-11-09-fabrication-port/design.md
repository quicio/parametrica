## Fabrication port

```js
{
  document,
  exporter,
  rebuild(),
  scheduleSessionSave(),
  setProductPreviewEnabled(enabled),
  syncProductPreview(),
}
```

`document` and `exporter` are live getters. Commands are bound. The panel can
read and mutate document sub-objects, but it cannot reach unrelated App members.

## Composition

`createApp` passes `{ fabrication: createFabricationPort(app) }` to `Controls`.
The Fabricate section reads `controls.fabrication`.

## Verification

- The Fabricate section contains no `controls.app.` access.
- The port surface is documented in `FABRICATION_PORT`.
- All Fabricate e2e and Node checks pass.
