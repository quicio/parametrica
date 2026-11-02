## ADDED Requirements

### Requirement: Twisted seam welding

Tessellation SHALL weld a reversed closed seam by mirroring the opposite
coordinate, without duplicating the seam boundary.

#### Scenario: Reversed U seam

- **WHEN** the U axis is closed with a reversed seam
- **THEN** the last grid row is welded to the first row with V mirrored
- **AND** seam vertices are shared between adjacent faces
- **AND** no crack or doubled boundary is produced

#### Scenario: Reversed V seam

- **WHEN** the V axis is closed with a reversed seam
- **THEN** the last grid column is welded to the first column with U mirrored

#### Scenario: Normal seams

- **WHEN** a closed seam uses the normal mode
- **THEN** the existing index-to-index weld is unchanged
- **AND** triangle counts and normals remain equivalent

#### Scenario: Seam metadata

- **WHEN** a twisted seam is welded
- **THEN** the mesh records `twistU` / `twistV`
- **AND** reports the unique welded row and column counts

### Requirement: Twisted compatibility curves

Wireframe compatibility curves SHALL follow a reversed seam instead of drawing
a false straight closure.

#### Scenario: Mirrored isolines

- **WHEN** compatibility curves are generated for a twisted closed axis
- **THEN** mirrored isolines are paired into closed loops
- **AND** each loop traverses the mirrored pair
- **AND** normal seams keep their previous open/closed flags

#### Scenario: Point budget

- **WHEN** paired loops exceed the curve point budget
- **THEN** the existing budget enforcement still applies
- **AND** the mesh wireframe pass remains available as the exact edge view
