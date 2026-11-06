## MODIFIED Requirements

### Requirement: Fabricable solid

Fabricate SHALL turn the network into one closed organic solid under an
explicit quality profile.

#### Scenario: Tubes

- **WHEN** the organic preparation is enabled
- **THEN** every edge becomes a curved, variable-radius strut
- **AND** a solid floor and rim close the ends

#### Scenario: Joints

- **WHEN** three or more struts meet at a vertex
- **THEN** the configured joint style fills the junction
- **AND** blend joints use a localized blend; the first candidate is a local
  SDF + levelSet
- **AND** the method is benchmarked before becoming the default
- **AND** fallback is reported when blending is not possible

#### Scenario: Union

- **WHEN** the struts, joints, floor and rim are combined
- **THEN** Manifold produces one body
- **AND** the result is closed, manifold and has positive volume

#### Scenario: Openings and envelope

- **WHEN** the solid is finalized
- **THEN** interior openings are checked with a width gauge
- **AND** the outer envelope is checked
- **AND** violations are reported per cell/node
- **AND** opening area is not used as the manufacturing criterion

#### Scenario: Quality

- **WHEN** a finish quality is selected
- **THEN** curve, section and joint resolution follow that profile
- **AND** the finish profile is separate from the repair/SDF quality
- **AND** the selected profile reaches the worker and the export
- **AND** no silent upgrade occurs

#### Scenario: Micro cracks

- **WHEN** the union leaves a boundary loop smaller than 0.1 mm
- **THEN** the builder caps that loop
- **AND** larger holes still fail validation

#### Scenario: Export

- **WHEN** the body is exported as STL
- **THEN** the triangle count matches the report
- **AND** the units are millimetres
- **AND** the selected finish quality is the one exported

## ADDED Requirements

### Requirement: Organic finish controls

The generator SHALL expose finish controls without changing the cell network.

#### Scenario: Joint style

- **WHEN** the user chooses technical, rounded, blend or auto
- **THEN** only the solid derivation changes
- **AND** the preview network and cell geometry stay the same

#### Scenario: Strut profile

- **WHEN** the user changes the radius profile
- **THEN** the centerline network is unchanged
- **AND** the solid radius follows the profile

#### Scenario: Envelope

- **WHEN** the user chooses centerline or outer
- **THEN** the solid envelope follows the choice
- **AND** the nominal outer dimension is preserved within tolerance

#### Scenario: Finish quality

- **WHEN** the user chooses draft, standard or high finish quality
- **THEN** only the solid derivation changes
- **AND** the selected profile is persisted with the fabrication settings
- **AND** the preview and export report the same profile
