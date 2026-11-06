## ADDED Requirements

### Requirement: Feature-preserving self-intersection remesh

Self-intersection remesh SHALL use feature-aware projection.

#### Scenario: Remesh

- **WHEN** self-intersections are resolved by remesh
- **THEN** generated vertices are projected to the source surface
- **AND** features are snapped where detected
