## Why

ADR-0004 requires the composition root to be the only module that selects
concrete adapters. `App.js` still constructed P5, Controls, Exporter, notebook,
presets, session and dialogs, so the application layer depended outward.

## What Changes

- Add `src/composition/createApp.js` as the browser composition root.
- Inject stores and render/export/UI factories into `App`.
- Make `main.js` call `createApp`.
- Add boundary checks that keep concrete adapters out of `App`.
- Preserve every behavior and public method.

## Out of Scope

- Decoupling `Exporter` from the `App` instance (Phase A slice 3).
- Typing the ports (Phase C).
- Changing UI, document or export behavior.
