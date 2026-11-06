## ADDED Requirements

### Requirement: SDF repair controls

Fabricate SHALL expose SDF and remesh self-intersection repair.

#### Scenario: Strategies

- **WHEN** Repair is enabled
- **THEN** Off, Auto, Manifold SDF and Fast remesh are available
- **AND** Auto succeeds SDF when Manifold is ready

#### Scenario: Resolution

- **WHEN** SDF or remesh runs
- **THEN** the resolution input controls the grid/edge length

#### Scenario: Report

- **WHEN** SDF runs
- **THEN** the repair report shows the SDF strategy and resolution
