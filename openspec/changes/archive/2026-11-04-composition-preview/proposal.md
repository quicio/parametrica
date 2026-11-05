## Why

The Composition card in Start With uses the 96 px preset thumbnail scaled to a
160 px card. Vortex Stack is visually dense, so the result looks soft and hard
to read. The card is otherwise correct.

## What Changes

- Add a larger Start With preview size (192–240 px).
- Keep the 96 px preset browser preview unchanged.
- Include preview size in cache identity.
- Preserve equal card dimensions and placeholder fallback.
- Never mutate the active document while generating previews.

## Capabilities

### New Capabilities

- `composition-preview`: larger, legible composition previews.

### Modified Capabilities

- `preset-previews`: size-aware preview identity.
- `start-with`: sharp Composition preview.

## Impact

- `src/ui/StartWithOverlay.js`
- `src/application/App.js`
- `src/presets/preview.js` or a small preview helper
- Tests for preview size, cache identity and fallback

## Non-goals

- No new renderer.
- No composition editor.
- No change to preset browser thumbnail size.
- No network or persistence.
