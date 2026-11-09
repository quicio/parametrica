## Why

ADR-0006 requires architecture and type gates. The typecheck existed; the
dependency rule did not. The first `dependency-cruiser` run found one real
violation: App imported the UI mode-toggle helper.

## What Changes

- Install `dependency-cruiser`.
- Encode circular, domain, core, application, adapter, generator and export
  rules.
- Move `normalizeModes` / `toggleMode` into `domain/modeToggles.js`.
- Keep an empty known-violations baseline.
- Add `npm run arch:check` to `npm run check`.

## Out of Scope

- New product behavior.
- TypeScript conversion.
- Adding exceptions to the baseline.
