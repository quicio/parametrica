## ADDED Requirements

### Requirement: Fabrication UI port

The Fabricate panel SHALL consume a narrow fabrication port instead of the full
UI surface.

#### Scenario: Panel access

- **WHEN** the Fabricate section needs document, exporter, rebuild or Product
  preview
- **THEN** it reads `controls.fabrication`
- **AND** does not read `controls.app`

#### Scenario: Composition

- **WHEN** `createApp` builds `Controls`
- **THEN** it injects `createFabricationPort(app)`
- **AND** the port exposes only `document`, `exporter`, `rebuild`,
  `scheduleSessionSave`, `setProductPreviewEnabled` and `syncProductPreview`

### Requirement: Narrowing direction

Port splits SHALL reduce the UI surface, not duplicate it.

#### Scenario: Future ports

- **WHEN** Render, Notebook or Preset ports are split
- **THEN** `UI_SURFACE` shrinks or stops growing
- **AND** panels keep their current behavior
