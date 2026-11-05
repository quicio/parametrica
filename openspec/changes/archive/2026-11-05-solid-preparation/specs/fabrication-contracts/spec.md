## ADDED Requirements

### Requirement: Prepared fabrication source

Fabrication SHALL evaluate prepared geometry through the same validation gate
as authored geometry.

#### Scenario: Prepared body

- **WHEN** explicit preparation produces a mesh
- **THEN** it is validated before becoming exportable
- **AND** the report identifies that the source was prepared

#### Scenario: Failed preparation

- **WHEN** the prepared mesh is open, non-manifold, inconsistently oriented,
  degenerate or has invalid volume
- **THEN** STL export is rejected
- **AND** no partial file is written

#### Scenario: No silent repair

- **WHEN** preparation is disabled
- **THEN** the exporter never repairs or caps geometry
- **AND** the open-mesh rejection reason remains visible
