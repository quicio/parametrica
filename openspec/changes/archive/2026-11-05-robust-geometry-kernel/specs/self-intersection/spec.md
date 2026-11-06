## ADDED Requirements

### Requirement: Robust plane side classification

Self-intersection detection SHALL use the robust kernel when a double plane
distance is within tolerance.

#### Scenario: Near-degenerate side

- **WHEN** a vertex is within tolerance of another triangle's plane
- **THEN** the exact orientation sign decides front, back or coplanar

#### Scenario: Determinism

- **WHEN** the same mesh is checked twice
- **THEN** classifications and pairs are identical
