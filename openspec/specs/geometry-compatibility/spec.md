# geometry-compatibility Specification

## Purpose
Preserve document, layer, preset and notebook compatibility when geometry kinds are added.
## Requirements
### Requirement: Document v3 compatibility

The document, layer, preset and notebook formats SHALL remain compatible.

#### Scenario: Load existing document

- **WHEN** an existing v3 document is loaded
- **THEN** generator, operators, layers, view, animation and style are preserved
- **AND** no geometry contract is required inside the document

#### Scenario: Preset and notebook round-trip

- **WHEN** a preset or notebook is exported and imported
- **THEN** the result is equivalent to the current format
- **AND** no derived geometry is persisted

### Requirement: Legacy Curve adapter

The engine SHALL keep a legacy `curves` projection for existing consumers while
world geometry becomes canonical.

#### Scenario: Existing renderer

- **WHEN** the current p5 renderer reads evaluation output
- **THEN** it can consume the compatibility `curves`
- **AND** `x3/y3/h3` remain available to current tests and consumers

#### Scenario: New geometry consumer

- **WHEN** a new consumer requests geometry
- **THEN** it can read the canonical world geometry
- **AND** it does not need projected screen coordinates

### Requirement: Existing ids and parameters

All generator, operator and render-pass ids SHALL remain stable.

#### Scenario: Helix

- **WHEN** a saved Helix preset is restored
- **THEN** its id, params, strands and camera behavior remain valid

#### Scenario: Operators

- **WHEN** an existing 2D operator document is loaded
- **THEN** the operator id and parameter schema remain unchanged

### Requirement: Compatibility must be removable

Legacy adapters SHALL be explicit and isolated so they can be deleted after
migration.

#### Scenario: Adapter boundary

- **WHEN** the legacy renderer is replaced
- **THEN** only the adapter layer is removed or replaced
- **AND** generators and world operators do not depend on it
