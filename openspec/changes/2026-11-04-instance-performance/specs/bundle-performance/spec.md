## ADDED Requirements

### Requirement: Instance performance gate

Instance workloads SHALL have a documented performance gate.

#### Scenario: Regression

- **WHEN** the 24-instance benchmark regresses more than 25% on the same machine
- **THEN** the regression is investigated before raising the limit
