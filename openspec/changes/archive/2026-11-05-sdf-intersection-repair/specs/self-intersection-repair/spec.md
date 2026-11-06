## ADDED Requirements

### Requirement: SDF-first repair

Self-intersection repair SHALL prefer the SDF strategy.

#### Scenario: Auto

- **WHEN** Manifold is ready and pairs exist
- **THEN** SDF repair runs
- **AND** remesh is the fallback

#### Scenario: Report

- **WHEN** SDF runs
- **THEN** strategy, pair count, edge length, volume delta and triangle delta
  are reported
