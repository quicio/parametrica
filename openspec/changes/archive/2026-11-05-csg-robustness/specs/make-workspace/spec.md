## ADDED Requirements

### Requirement: CSG strategy controls

Fabricate SHALL expose the robust CSG strategy.

#### Scenario: Controls

- **WHEN** a boolean recipe is selected
- **THEN** Auto, BSP and Remesh are available
- **AND** Auto remains the default

#### Scenario: Report

- **WHEN** a boolean runs
- **THEN** the panel reports actual strategy, fallback, epsilon, splits, timing
  and volume delta

#### Scenario: Failure

- **WHEN** all strategies fail
- **THEN** export remains disabled
- **AND** the reason identifies topology, complexity or remesh failure
