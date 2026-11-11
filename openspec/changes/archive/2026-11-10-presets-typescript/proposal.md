## Why

The preset catalog, fabricate object builders, built-in preset factories and
the preset manager are the preset browser's data and persistence layer. They
were the last untyped preset modules.

## What Changes

- Convert `presets/catalog.js`, `presets/objectBuilders.js`,
  `presets/builtins.js` and `presets/PresetManager.js` to `.ts`.
- Type catalog metadata, layer builders, built-in documents, user presets,
  favorites/recents, previews and serialization.
- Keep JS compatibility re-exports and point internal imports at `.ts`.

## Out of Scope

- Preset panel UI and preview rendering (already typed).
- Changing preset documents, categories, storage keys or preview behavior.
