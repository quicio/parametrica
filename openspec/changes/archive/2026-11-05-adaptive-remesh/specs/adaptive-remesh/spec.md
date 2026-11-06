## Purpose

Improve remesh fidelity by projecting generated vertices onto the source
surface and snapping near sharp feature edges.

## ADDED Requirements

### Requirement: Feature detection

Remesh SHALL detect sharp source edges.

#### Scenario: Dihedral angle

- **WHEN** an edge is shared by two faces whose dihedral angle exceeds the
  configured threshold
- **THEN** it is treated as a feature edge
- **AND** the count is reported

#### Scenario: Smooth surface

- **WHEN** adjacent faces are below the threshold
- **THEN** the edge is not a feature edge

### Requirement: Projection

Remesh SHALL project generated vertices to the source surface.

#### Scenario: Surface point

- **WHEN** projection is enabled
- **THEN** each generated vertex moves to the closest source surface point
- **AND** topology is unchanged

#### Scenario: Feature snap

- **WHEN** a feature edge is within the snap distance
- **THEN** the vertex is snapped to the edge
- **AND** sharp features are better preserved

#### Scenario: Disabled

- **WHEN** projection is disabled
- **THEN** the raw grid iso-surface is used

### Requirement: Validation and determinism

Projected remesh SHALL remain deterministic and valid.

#### Scenario: Valid result

- **WHEN** projection completes
- **THEN** the mesh is welded, oriented, topology-repaired and validated

#### Scenario: Repeat

- **WHEN** the same source and options are remeshed twice
- **THEN** geometry is identical
