## ADDED Requirements

### Requirement: Preset UI port

The preset browser and save/delete controls SHALL use a narrow preset port.

#### Scenario: Preset access

- **WHEN** PresetPanel or the preset controls need document, presets, import or
  notification
- **THEN** every member is listed in `PRESET_PORT`
- **AND** unrelated App members are unavailable

### Requirement: Laboratory UI port

Analysis, Explore and Evolution panels SHALL use a narrow laboratory port.

#### Scenario: Lab access

- **WHEN** a laboratory panel needs document analysis, candidate adoption,
  notebook or checkpoint save
- **THEN** every member is listed in `LAB_PORT`
- **AND** the UI surface does not grow

### Requirement: Port coverage

Boundary checks SHALL scan the panel source for every `app.*` use.

#### Scenario: New dependency

- **WHEN** a preset or lab panel uses a new App member
- **THEN** the architecture test fails until the port is updated deliberately
