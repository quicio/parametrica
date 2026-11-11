## Why

The composition ports are the explicit surfaces between App and UI panels.
They were the last untyped composition modules and relied on dynamic method
binding.

## What Changes

- Add `composition/portUtils.ts` with typed binding helpers.
- Convert all `create*Port.js` modules to `.ts`, including the UI Proxy.
- Add the UI-only `exploreSeed` field to App so the lab port is typed.
- Keep JS compatibility re-exports and update the maintainability check.
- Extend the renderer port contract with capture/pin methods.

## Out of Scope

- `createApp.js` and concrete adapter construction.
- Changing port allow-lists, binding behavior or UI access rules.
