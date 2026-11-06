## ADDED Requirements

### Requirement: Level set adapter

The Manifold adapter SHALL expose `levelSet`.

#### Scenario: API

- **WHEN** an SDF, bounds and edge length are supplied
- **THEN** `Manifold.levelSet` runs
- **AND** the result is converted and validated

#### Scenario: Not ready

- **WHEN** Manifold is still loading
- **THEN** level set returns `not-ready`
