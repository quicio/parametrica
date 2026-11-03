## ADDED Requirements

### Requirement: Mapping after surface operators

SurfaceMapping SHALL remain consistent with the transformed Surface.

#### Scenario: Topology-preserving transform

- **WHEN** an operator only changes world vertex positions
- **THEN** the existing domain, cells and corner UVs remain valid
- **AND** picking and seam overlays use the transformed vertices

#### Scenario: Topology-changing operator

- **WHEN** an operator changes grid dimensions, closure or seam structure
- **THEN** the old mapping is discarded
- **AND** a new mapping is generated from the resulting Surface

#### Scenario: Invalid result

- **WHEN** an operator cannot produce a valid Surface/mapping
- **THEN** the result is explicit (Mesh or error)
- **AND** no stale SurfaceMapping is reused
