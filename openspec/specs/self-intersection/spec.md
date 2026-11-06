# self-intersection Specification

## Purpose
Detect and report self-intersecting triangle pairs deterministically so
fabrication never accepts a folded mesh.
## Requirements
### Requirement: Deterministic detection

The geometry layer SHALL provide deterministic self-intersection detection for
indexed meshes.

#### Scenario: Non-intersecting mesh

- **WHEN** no triangle pair intersects
- **THEN** the result reports zero pairs
- **AND** it still reports that the check ran

#### Scenario: Intersecting pair

- **WHEN** two non-adjacent triangles cross
- **THEN** the pair is reported with both face indices
- **AND** repeated runs report the same indices in the same order

#### Scenario: Adjacent triangles

- **WHEN** two triangles share a vertex or edge within tolerance
- **THEN** the shared contact is not reported as a self-intersection

### Requirement: Bounded reporting

The detector SHALL bound its work and output for pathological meshes.

#### Scenario: Pair limit

- **WHEN** more intersecting pairs exist than the configured limit
- **THEN** the result is marked truncated
- **AND** the reported count reflects the collected pairs

#### Scenario: Degenerate faces

- **WHEN** a face is degenerate or invalid
- **THEN** it is skipped by the detector
- **AND** normal mesh validation still reports it

### Requirement: Validation gate

Self-intersections SHALL be part of effective mesh validation.

#### Scenario: Fabrication rejection

- **WHEN** a mesh reports one or more self-intersecting pairs
- **THEN** mesh validation fails
- **AND** solid promotion and fabrication export are rejected

#### Scenario: No repair

- **WHEN** self-intersections are found
- **THEN** the validator reports them
- **AND** it does not move vertices, remove faces or attempt repair

### Requirement: Robust plane side classification

Self-intersection detection SHALL use the robust kernel when a double plane
distance is within tolerance.

#### Scenario: Near-degenerate side

- **WHEN** a vertex is within tolerance of another triangle's plane
- **THEN** the exact orientation sign decides front, back or coplanar

#### Scenario: Determinism

- **WHEN** the same mesh is checked twice
- **THEN** classifications and pairs are identical

