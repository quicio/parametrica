## Why

Every launch currently shows the same default parametric figure. The session
snapshot is saved, but recovery is an explicit banner action, so the work the
user was doing is not resumed automatically.

The default stroke is also too heavy for the new surface/fabrication views.

## What Changes

- Restore the last valid session automatically on startup, before first paint.
- Restore the entire document: generator, params, operators, layers, styles,
  view and animation time (never playback).
- Keep corrupt/quota failures safe and fall back to the default document.
- Show a short non-blocking notice when a session was restored.
- Change the default stroke width from 2 to 1.
- Remove the explicit Restore/Dismiss recovery banner.

## Capabilities

### Modified Capabilities

- `session-recovery`: automatic restore replaces explicit recovery.
- `artboard-style-panel`: default stroke width is 1.

## Impact

- App startup/session wiring.
- Default style and exporter fallbacks.
- Session recovery e2e and default-style unit test.
- No storage schema change.
- No geometry, renderer pass, export format or fabrication change.

## Non-goals

- No cloud sync.
- No multi-document history.
- No new “start fresh” workflow beyond existing presets/generators.
- No change to notebook checkpoints.
