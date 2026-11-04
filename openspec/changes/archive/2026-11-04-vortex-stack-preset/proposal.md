## Why

Instance Layers can build compelling compositions, but they require manual setup
and a console script. Users need a built-in example that demonstrates hidden
sources, shared parameters, per-instance transforms, source-aware inspection and
the single-body Fabricate limitation.

The preset browser also needs a composition category and stable metadata for
documents whose active layer is an instance.

## What Changes

- Add the built-in **Vortex Stack** preset.
- Add a **Compositions** catalog category.
- Resolve built-in generator badges from the first generator layer when the
  active layer is an instance.
- Make preview hashing stable for layer/instance references.
- Keep the preset deterministic, non-animated and valid at load.

## Capabilities

### New Capabilities

- `composition-presets`: built-in layered/instance compositions.

### Modified Capabilities

- `preset-browser`: Compositions category and generator metadata.
- `preset-previews`: composition previews and stable reference hashing.

## Impact

- `src/presets/builtins.js`
- `src/presets/catalog.js`
- `src/presets/PresetManager.js`
- `src/presets/preview.js`
- Preset browser unit/e2e tests
- No renderer, geometry, document version or export change.

## Non-goals

- No composition editor.
- No new instance operators.
- No mirror.
- No multi-body or 3MF.
- No change to the active session or user presets.
