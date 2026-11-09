## Why

The UI port made the application surface explicit, but the Fabricate panel still
used the whole surface. It only needs document view state, rebuild, session save
and Product preview commands.

## What Changes

- Add `composition/createFabricationPort.js` with an explicit six-member surface.
- Pass the fabrication port to `Controls`.
- Make the Fabricate section use `controls.fabrication` instead of
  `controls.app`.
- Add boundary checks for the panel and the port.
- Preserve every panel behavior.

## Out of Scope

- Splitting Render, Notebook, Preset or Document ports.
- Typing the port.
- Changing fabrication logic.
