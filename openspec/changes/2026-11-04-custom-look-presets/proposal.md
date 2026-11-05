## Why

Look has seven built-in visual presets, but users cannot keep a visual recipe
they like. Saving a document preset preserves geometry too, which is the wrong
scope for a Look.

## What Changes

- Save the current view-level look under a user name.
- Apply, overwrite and delete user looks.
- Store looks locally with a versioned schema.
- Keep built-ins immutable and visually separate.
- Reuse the existing Looks section; no new workspace.

## Capabilities

### New Capabilities

- `custom-look-presets`: user-authored visual recipes.

### Modified Capabilities

- `look-presets`: user preset section and actions.

## Impact

- Look presets module/storage
- Looks UI
- localStorage schema and sanitization
- Unit/e2e tests
- No geometry, style, units, export or fabrication change.

## Non-goals

- No document presets.
- No cloud sync.
- No preview thumbnails.
- No per-layer looks.
