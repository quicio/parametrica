## ADDED Requirements

### Requirement: Strategy reporting

Boolean results SHALL report the strategy used and any fallback.

#### Scenario: Requested vs actual

- **WHEN** the requested strategy is auto
- **THEN** the report includes the requested strategy, actual strategy and
  fallback reason
- **AND** determinism is preserved

#### Scenario: Regression

- **WHEN** strategy is bsp
- **THEN** the Phase 5D cube/sphere matrix remains valid
- **AND** volumes and empty cases are unchanged
