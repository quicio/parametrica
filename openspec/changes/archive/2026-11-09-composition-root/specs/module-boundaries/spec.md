## ADDED Requirements

### Requirement: Composition root ownership

The browser composition root SHALL be the only module that selects concrete
adapters and stores.

#### Scenario: Boot

- **WHEN** the browser app starts
- **THEN** `main.js` calls `composition/createApp.js`
- **AND** `createApp` constructs persistence, session, presets, notebook, UI,
  renderer and exporter implementations

#### Scenario: Application purity

- **WHEN** `application/App.js` is inspected
- **THEN** it does not import `P5Adapter`, `Controls`, `Exporter`, `StartWithOverlay`,
  dialogs, overlays, `PresetManager`, `Notebook`, `SessionStore` or
  `MutationEngine`
- **AND** it receives them as services or adapter factories

### Requirement: Behavior parity

Moving construction to the composition root SHALL NOT change public behavior.

#### Scenario: Existing flows

- **WHEN** the app restores a session, applies a preset, exports, switches to
  Product preview or opens Start With
- **THEN** the behavior is unchanged
- **AND** all Node and Playwright suites pass
