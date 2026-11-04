## ADDED Requirements

### Requirement: Instance mapping identity

SurfaceMapping produced by an instance SHALL identify the instance surface and
mesh, never the source.

#### Scenario: Regenerated mapping

- **WHEN** an instance Surface is tessellated
- **THEN** the mapping uses the instance `surfaceId` and `meshId`
- **AND** domain, grid, cell and UV come from the cloned Surface

#### Scenario: Source metadata

- **WHEN** mapping exposes source metadata
- **THEN** it is informational only
- **AND** it is never used as the mapping identity

#### Scenario: Topology change

- **WHEN** an instance operator changes topology
- **THEN** the operator is rejected in the MVP
- **AND** no stale mapping is exposed
