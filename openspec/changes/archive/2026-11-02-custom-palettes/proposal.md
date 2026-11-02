## Why

The preset palette list is fixed. Users can edit colors manually, but cannot
keep a named combination for reuse without saving a whole preset. A small
custom palette store closes that gap.

## What Changes

- Add `PaletteStore` with local storage and injected-storage tests.
- Save current background/stroke/fill under a name; same name replaces.
- Delete custom palettes; built-ins remain immutable.
- Style palette select lists built-ins and custom entries.
- Add name/save/delete controls; applying writes explicit document values.
- Keep palettes independent from the color ramp.

## Capabilities

### New Capabilities

- `custom-palettes`: local palette storage and application.

### Modified Capabilities

- None.

## Impact

- Modified: `src/render/palettes.js`, `src/ui/Controls.js`, `style.css`.
- Tests: `test/lab.smoke.mjs`, `e2e/hardening.spec.js`.
- Docs: README, SPEC, architecture, audit, roadmap.
- No document format change.
- No ramp/palette sync; no per-layer palette storage.

## Non-goals

- No cloud/user-account palette sync.
- No palette import/export file format.
- No gradient-ramp synchronization.
- No per-layer or per-pass palettes.
