## ADDED Requirements

### Requirement: Robust ear clipping

Planar cap ear clipping SHALL use exact 2D orientation signs.

#### Scenario: Near-collinear vertex

- **WHEN** a projected polygon has a near-collinear vertex
- **THEN** the exact sign decides whether it is a valid ear
- **AND** cap determinism is preserved
