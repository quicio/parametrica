## ADDED Requirements

### Requirement: Typed preview and advisor support

Preset previews and the advisor cache/prompt helpers SHALL be strict
TypeScript.

#### Scenario: Preset preview

- **WHEN** a preset document is hashed or rendered as a thumbnail
- **THEN** documents, options, keys and thumbnails are typed
- **AND** cache bypass and preview output are unchanged

#### Scenario: Advisor cache

- **WHEN** responses are cached by document/provider/prompt key
- **THEN** keys, values, recency and size are typed
- **AND** bounded eviction is unchanged

#### Scenario: Advisor prompt

- **WHEN** a grounded prompt is built from descriptors, diffs and sensitivity
- **THEN** input, compact summaries, messages and payload are typed
- **AND** the serialized payload is unchanged

### Requirement: Preview/advisor compatibility

The old `presets/preview.js`, `ai/cache.js` and `ai/prompt.js` paths SHALL keep
resolving.

#### Scenario: Import

- **WHEN** presets, advisor, UI or tests import the old paths
- **THEN** compatibility re-exports resolve
- **AND** behavior is unchanged
