## ADDED Requirements

### Requirement: Typed App controller

The application controller SHALL be strict TypeScript.

#### Scenario: Controller state

- **WHEN** the controller is constructed
- **THEN** document, evaluation, history, session, notebook, preview, overlay,
  renderer and controls state is typed
- **AND** services and adapter factories arrive through structural ports

#### Scenario: Controller flows

- **WHEN** documents are evaluated, mutated, restored, exported or previewed
- **THEN** method inputs and outputs are typed
- **AND** behavior is unchanged

### Requirement: App compatibility

The old `application/App.js` path SHALL keep resolving.

#### Scenario: Import

- **WHEN** composition or tests import the old path
- **THEN** a compatibility re-export resolves
- **AND** behavior is unchanged

## MODIFIED Requirements

### Requirement: Import direction

The dependency direction SHALL be documented and enforced.

#### Scenario: Core independence

- **WHEN** any runtime module under `src/core` is loaded in Node
- **THEN** it does not import UI widgets, DOM panels or lil-gui
- **AND** no controller file outside the composition root imports UI modules

#### Scenario: UI may depend on core

- **WHEN** a UI widget needs registry or document helpers
- **THEN** it imports from core through public module exports

### Requirement: Composition root ownership

The browser composition root SHALL be the only module that selects concrete
adapters and stores.

#### Scenario: Boot

- **WHEN** the browser app starts
- **THEN** `main.js` calls `composition/createApp.js`
- **AND** `createApp` constructs persistence, session, presets, notebook, UI,
  renderer and exporter implementations

#### Scenario: Application purity

- **WHEN** `application/App.ts` is inspected
- **THEN** it does not import `P5Adapter`, `Controls`, `Exporter`, `StartWithOverlay`,
  dialogs, overlays, `PresetManager`, `Notebook`, `SessionStore` or
  `MutationEngine`
- **AND** it receives them as services or adapter factories
