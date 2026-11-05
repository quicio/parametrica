## Purpose

Provide deterministic, non-destructive mesh preparation that can close and
weld fabrication geometry without changing render geometry.

## ADDED Requirements

### Requirement: Vertex weld

The geometry layer SHALL weld coincident mesh vertices within an explicit
tolerance.

#### Scenario: Duplicate vertices

- **WHEN** two vertices are within the weld tolerance
- **THEN** faces reference one merged vertex
- **AND** the original mesh is not mutated

#### Scenario: Degenerate result

- **WHEN** welding collapses a face below three distinct vertices or zero area
- **THEN** the face is removed
- **AND** the change is reported

#### Scenario: Tolerance boundary

- **WHEN** vertices are farther apart than the tolerance
- **THEN** they remain distinct

### Requirement: Boundary loops

The geometry layer SHALL detect open boundary edges and assemble them into
ordered loops.

#### Scenario: Single hole

- **WHEN** a mesh has one open boundary
- **THEN** the loop is returned in directed order
- **AND** an open mesh with no boundary edges returns no loops

#### Scenario: Incomplete loop

- **WHEN** boundary edges do not form a closed loop
- **THEN** the loop is reported as incomplete
- **AND** no cap is generated for it

### Requirement: Hole caps

The geometry layer SHALL cap eligible boundary loops with deterministic
triangles that preserve mesh orientation.

#### Scenario: Cap

- **WHEN** a boundary loop has at least three edges and is within the maximum
- **THEN** the loop is filled
- **AND** every original boundary edge is shared by exactly two faces
- **AND** the cap uses the same winding contract as the surrounding mesh

#### Scenario: Oversized hole

- **WHEN** a boundary loop exceeds `maxHoleEdges`
- **THEN** it is skipped
- **AND** a warning identifies the skipped loop

#### Scenario: Triangle hole

- **WHEN** the boundary loop has exactly three edges
- **THEN** it is closed with one reversed triangle
- **AND** no extra centroid vertex is added

### Requirement: Mesh merge

The geometry layer SHALL merge meshes without losing face identity.

#### Scenario: Disjoint shells

- **WHEN** two meshes are merged
- **THEN** face indices are offset correctly
- **AND** disjoint closed shells remain valid

#### Scenario: Optional weld

- **WHEN** merge requests welding
- **THEN** coincident vertices across inputs are merged after concatenation
- **AND** the report records merged vertices and removed faces

### Requirement: Explicit preparation

Preparation SHALL be opt-in and derived only.

#### Scenario: Default

- **WHEN** preparation is not configured or disabled
- **THEN** the source mesh is used unchanged
- **AND** existing open-mesh rejection behavior is preserved

#### Scenario: Enabled

- **WHEN** weld or cap is enabled
- **THEN** a prepared copy is validated
- **AND** the source layer and render meshes are not mutated
- **AND** the changes are reported to the caller

#### Scenario: Invalid result

- **WHEN** preparation does not produce a closed valid mesh
- **THEN** fabrication export remains disabled
- **AND** validation reasons are shown
