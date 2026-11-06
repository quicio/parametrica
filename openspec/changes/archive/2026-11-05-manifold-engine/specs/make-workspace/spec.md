## ADDED Requirements

### Requirement: Manifold controls

Fabricate SHALL expose the Manifold strategy and readiness.

#### Scenario: Strategy

- **WHEN** a boolean recipe is selected
- **THEN** Auto, Manifold, BSP and Remesh are available
- **AND** Auto remains the default

#### Scenario: Readiness

- **WHEN** Manifold is still loading
- **THEN** the UI can show readiness
- **AND** explicit Manifold reports `not-ready`

#### Scenario: Report

- **WHEN** Manifold runs
- **THEN** the Boolean result row reports `manifold` and any fallback
