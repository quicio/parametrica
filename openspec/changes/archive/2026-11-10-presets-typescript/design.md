## Types

- `PresetCategory`, `PresetMeta`, `PresetEntry`, `PresetCategoryChip`.
- `SurfaceLayerOptions`, revolved/rounded/cylinder builder options.
- `PresetManagerOptions`, `PreviewCacheEntry`, `PresetParseResult`.
- Built-in presets are `Record<string, () => DocumentShape>`.

## Rules

- Built-in factories still return fresh documents.
- Catalog metadata, categories and search semantics are unchanged.
- Storage keys, favorites/recents and preview caches are unchanged.

## Verification

- `tsc --noEmit`, Node, arch and e2e gates pass.
- Preset documents, catalog, storage and previews are unchanged.
