## Why

The first TypeScript slice covered units, overlays, fabrication, scene, pass
style and mode helpers. Look presets and manufacturing profiles are the next
pure domain policies used by both application and UI.

## What Changes

- Convert `domain/lookPresets.js` and `domain/manufacturingProfile.js` to `.ts`.
- Type look context, view, user look, profiles, checks and reports.
- Keep `render/lookPresets.js` and `geometry/manufacturingProfile.js` as
  compatibility re-exports.
- Update the architecture test for the new re-export paths.

## Out of Scope

- Interaction ray/picker conversion.
- UI/application conversion.
- Runtime behavior changes.
