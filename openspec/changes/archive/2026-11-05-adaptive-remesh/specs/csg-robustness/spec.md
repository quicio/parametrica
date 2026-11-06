## ADDED Requirements

### Requirement: Feature-preserving CSG fallback

CSG remesh fallback SHALL use feature-aware projection.

#### Scenario: Fallback

- **WHEN** BSP fails and remesh is used
- **THEN** projection is enabled by default
- **AND** projection/feature stats are reported
