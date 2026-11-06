## ADDED Requirements

### Requirement: 3MF export

The system SHALL export validated Meshes/Solids as 3MF.

#### Scenario: Multi-body

- **WHEN** several validated bodies are exported
- **THEN** each becomes a separate 3MF object
- **AND** the build references every object

#### Scenario: Separation

- **WHEN** 3MF is exported in Node without a renderer
- **THEN** export succeeds
- **AND** camera/view changes cannot affect the bytes
