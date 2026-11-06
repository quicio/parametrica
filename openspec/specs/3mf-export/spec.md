# 3mf-export Specification

## Purpose
Produce deterministic, unit-aware 3MF packages for validated fabrication
bodies while preserving body identity.
## Requirements
### Requirement: Minimal 3MF package

The exporter SHALL produce a valid minimal 3MF OPC package.

#### Scenario: Entries

- **WHEN** a 3MF is exported
- **THEN** the package contains content types, relationships and one model part
- **AND** no extra parts are required

#### Scenario: Model

- **WHEN** the model part is parsed
- **THEN** it declares a millimetre unit
- **AND** it contains mesh resources and a build section

### Requirement: Body identity

Each validated body SHALL become one 3MF object.

#### Scenario: Single body

- **WHEN** one body is exported
- **THEN** one object and one build item are written

#### Scenario: Multi-body

- **WHEN** several validated bodies are exported
- **THEN** each body becomes a separate object and build item
- **AND** object order follows input order

### Requirement: Units and scale

3MF export SHALL use explicit physical scale.

#### Scenario: Millimetres

- **WHEN** a world-to-millimetre scale is configured
- **THEN** vertices are scaled in the XML
- **AND** the model unit is millimetre
- **AND** source geometry is not mutated

#### Scenario: Missing scale

- **WHEN** physical scale is absent
- **THEN** export is rejected
- **AND** no package is produced

### Requirement: Validation gate

3MF SHALL reject invalid fabrication geometry.

#### Scenario: Invalid body

- **WHEN** any body is open, non-manifold, inconsistently oriented,
  self-intersecting or has invalid volume
- **THEN** the whole export is rejected
- **AND** no partial package is written

#### Scenario: Valid bodies

- **WHEN** every body validates
- **THEN** object meshes contain finite vertices and valid triangle indices

### Requirement: Determinism

3MF output SHALL be byte-deterministic.

#### Scenario: Repeat

- **WHEN** the same bodies, scale and metadata are exported twice
- **THEN** the package bytes are identical
- **AND** ZIP timestamps and object IDs are stable

