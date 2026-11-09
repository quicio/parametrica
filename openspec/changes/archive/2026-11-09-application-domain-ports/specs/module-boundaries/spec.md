## ADDED Requirements

### Requirement: Domain look and picking policy

Pure look presets, scene contracts and picking math SHALL live in domain.

#### Scenario: Application import

- **WHEN** the application applies a look, builds a render scene or picks a
  surface
- **THEN** it imports `domain/lookPresets.js`, `domain/scene.js` or
  `domain/interaction/`
- **AND** does not import `render/lookPresets`, `render/scene` or
  `interaction/ray|surfacePicker`

### Requirement: Panel-specific ports

UI panels SHALL receive narrow ports rather than the broad control surface.

#### Scenario: Form, Look, Keep, Ingest, Advisor and Start With

- **WHEN** a panel is constructed
- **THEN** it receives only its documented port
- **AND** unknown members are unavailable

### Requirement: Hardened dependency gate

The architecture gate SHALL forbid application → render/interaction and UI →
composition/App.

#### Scenario: Gate run

- **WHEN** `npm run arch:check` runs
- **THEN** application → render and application → interaction fail
- **AND** the known-violations baseline remains empty
