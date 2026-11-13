## ADDED Requirements

### Requirement: Typed preset panel

The preset panel SHALL be strict TypeScript.

#### Scenario: Browse

- **WHEN** presets are searched, filtered, previewed or favorited
- **THEN** entries, categories, ports and preview queues are typed
- **AND** browsing and preview behavior are unchanged

### Requirement: Preset compatibility

The old `ui/widgets/PresetPanel.js` path SHALL keep resolving.

#### Scenario: Import

- **WHEN** keep sections import the old path
- **THEN** a compatibility re-export resolves
- **AND** preset-port checks read the typed module
