## Purpose

Close the structural audit risks that do not require new product surface.

## ADDED Requirements

### Requirement: Document-scoped layer identity

New layer and instance IDs SHALL be unique within the current document.

#### Scenario: Restored session

- **WHEN** a session containing `layer-N` is restored
- **AND** the user adds a layer or instance
- **THEN** the new ID does not collide with any existing layer ID

#### Scenario: Existing documents

- **WHEN** an existing document is loaded
- **THEN** its layer IDs are preserved
- **AND** subsequent IDs remain readable and unique

### Requirement: Deterministic Surface IDs

Evaluated Surface IDs SHALL be deterministic for the same document, layer, time
and quality.

#### Scenario: Bypass cache

- **WHEN** a surface document is evaluated twice with cache bypass
- **THEN** the Surface IDs are identical

#### Scenario: Instance metadata

- **WHEN** an instance references a source Surface
- **THEN** the source Surface ID is deterministic
- **AND** the instance keeps its own derived IDs

### Requirement: Reproducible e2e session

The e2e session fixture SHALL be generated from current defaults.

#### Scenario: Test start

- **WHEN** `npm run test:e2e` starts
- **THEN** the fixture is generated before Playwright runs
- **AND** repeated generation is stable

### Requirement: Advisor safety

Advisor resolution SHALL NOT throw for instance or generator-less layers.

#### Scenario: Instance active

- **WHEN** a suggestion path is resolved against an instance layer
- **THEN** resolution returns no target
- **AND** no exception is thrown

### Requirement: Current documentation

README and SPEC SHALL reflect current gates and shipped capabilities.

#### Scenario: Current status

- **WHEN** the docs are read
- **THEN** unit/e2e counts match the current suite
- **AND** Instance Layers, Start With, Units and Fabricate are represented
