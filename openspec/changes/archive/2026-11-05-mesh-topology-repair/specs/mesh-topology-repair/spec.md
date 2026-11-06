## Purpose

Diagnose and repair non-manifold edges and non-orientable topology explicitly,
without silently exporting invalid or false-closed geometry.

## ADDED Requirements

### Requirement: Explicit topology repair

Topology repair SHALL be opt-in and strategy-driven.

#### Scenario: Default

- **WHEN** topology repair is not requested
- **THEN** non-manifold and non-orientable meshes remain validation failures
- **AND** no geometry is silently modified

#### Scenario: Report

- **WHEN** topology repair runs
- **THEN** split edges, duplicated vertices, seam cuts, removed faces and
  remaining errors are reported

### Requirement: Non-manifold edge splitting

Repair SHALL split non-manifold edge fans into manifold edges.

#### Scenario: Split

- **WHEN** an edge is shared by more than two faces
- **THEN** incident faces are grouped into deterministic fans
- **AND** extra fans receive duplicated edge vertices
- **AND** geometry positions are unchanged

#### Scenario: Remove

- **WHEN** strategy is remove
- **THEN** extra fan faces are removed
- **AND** the removal is reported

#### Scenario: Limit

- **WHEN** the number of non-manifold edges exceeds `maxEdges`
- **THEN** repair fails with `complexity`
- **AND** no partial mesh is returned

### Requirement: Non-orientable handling

Repair SHALL detect and explicitly handle non-orientable cycles.

#### Scenario: Cut

- **WHEN** strategy is cut and a contradiction cycle is found
- **THEN** a seam is cut by duplicating seam vertices
- **AND** the result is an orientable open patch

#### Scenario: Reject

- **WHEN** strategy is reject
- **THEN** the mesh is returned as non-orientable
- **AND** no geometry is produced

#### Scenario: Closed non-orientable surface

- **WHEN** capping a cut patch would produce a closed non-orientable surface
- **THEN** the result is rejected
- **AND** the mode does not claim success

### Requirement: Validation

Every topology repair result SHALL pass the standard mesh gate.

#### Scenario: Valid result

- **WHEN** topology repair succeeds
- **THEN** the mesh is manifold, consistently oriented and validated
- **AND** non-manifold and non-orientable counts are zero or explicitly
  reported

#### Scenario: Remaining errors

- **WHEN** topology errors remain
- **THEN** fabrication export is disabled
- **AND** the remaining errors are shown

### Requirement: Determinism

Topology repair SHALL be deterministic.

#### Scenario: Repeat

- **WHEN** the same mesh and options are repaired twice
- **THEN** the topology and face order are identical
