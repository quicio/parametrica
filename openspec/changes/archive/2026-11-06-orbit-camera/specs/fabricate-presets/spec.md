## MODIFIED Requirements

### Requirement: Upright vase presentation

The hollow vase example SHALL stand with its height on the vertical Z axis and
its mouth at the top of the 3D view.

#### Scenario: Height axis

- **WHEN** `Solid Vase 200` is loaded
- **THEN** its 200 mm height runs along Z
- **AND** the mouth is at the high-Z end

#### Scenario: Starting view

- **WHEN** the preset opens in the 3D view
- **THEN** the camera shows the mouth above the base

#### Scenario: Symmetry

- **WHEN** the vase is viewed from any horizontal direction
- **THEN** every cross-section is circular around Z
- **AND** the front and side silhouettes match

#### Scenario: Mouth

- **WHEN** the top row of the vase is measured
- **THEN** the mouth diameter is about 135 mm

#### Scenario: Export orientation

- **WHEN** the vase is exported to STL or 3MF
- **THEN** its height stays on Z
- **AND** a slicer can stand it on the bed without rotating it
