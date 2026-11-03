## ADDED Requirements

### Requirement: Surface operator stage

Surface documents SHALL execute declared world operators before tessellation.

#### Scenario: Operator before tessellation

- **WHEN** a surface document has a supported world operator
- **THEN** the Surface is generated, then transformed
- **AND** tessellation and projection consume the transformed Surface

#### Scenario: Multiple surfaces

- **WHEN** an operator produces multiple Surfaces/Meshes
- **THEN** all are validated
- **AND** each keeps its own identity/mapping relationship

#### Scenario: Camera-only change

- **WHEN** only the camera changes
- **THEN** world surface operators and SurfaceMapping are reused
- **AND** only projection/render recomputes

#### Scenario: Topology change

- **WHEN** an operator changes grid topology or sample counts
- **THEN** SurfaceMapping and downstream mesh caches are invalidated
- **AND** the new mapping is derived from the resulting Surface
