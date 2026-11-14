## Why

Controls is the last JavaScript module. It coordinates modes, sections, ports,
fabrication jobs, look presets and render-pass state.

## What Changes

- Convert `ui/Controls.js` to `.ts`.
- Type the app/ports, section interfaces, DOM state, fabrication reports and
  render mode entries.
- Point maintainability and architecture checks at the typed module.
- Keep the JS compatibility re-export.

## Out of Scope

- Behavior changes.
