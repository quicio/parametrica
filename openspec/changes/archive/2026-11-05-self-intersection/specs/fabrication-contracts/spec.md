## ADDED Requirements

### Requirement: Self-intersection diagnostics

Fabrication validation SHALL reject meshes with detected self-intersections.

#### Scenario: Checked mesh

- **WHEN** fabrication validation runs on a mesh
- **THEN** the validation record reports whether the self-intersection check ran
- **AND** the number of intersecting pairs found

#### Scenario: Intersecting mesh

- **WHEN** one or more self-intersecting pairs are found
- **THEN** STL export is rejected
- **AND** the error identifies the self-intersection
- **AND** no bytes are written

#### Scenario: No silent limitation

- **WHEN** the check runs successfully
- **THEN** the previous "not implemented" warning is not emitted
