## ADDED Requirements

### Requirement: Manifold CSG strategy

Robust CSG SHALL offer a Manifold strategy.

#### Scenario: Overlapping tori

- **WHEN** full-resolution tori are unioned, subtracted or intersected with
  Manifold
- **THEN** the result is valid and watertight
- **AND** no remesh approximation is used

#### Scenario: Regression

- **WHEN** Manifold is unavailable
- **THEN** BSP/remesh behavior remains unchanged
