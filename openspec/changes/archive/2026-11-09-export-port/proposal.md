## Why

`Exporter` is an adapter but held the whole `App` and read document, renderer,
controls, product preview, presets and time directly. That made export tests
depend on the composition object and kept an outward edge in the adapter.

## What Changes

- Add an explicit export port contract.
- Make `Exporter` consume only that port.
- Create the port in `composition/createApp.js`.
- Keep the legacy plain fixture shape for unit tests.
- Add boundary checks for the exporter.

## Out of Scope

- Changing SVG/PNG/GIF/STL/3MF bytes.
- Splitting render/export use cases further.
- Typing the port (Phase C).
