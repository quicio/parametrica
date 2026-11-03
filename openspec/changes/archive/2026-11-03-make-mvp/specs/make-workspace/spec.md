## Purpose

Provide a narrow, read-only fabrication gate and STL export for validated
watertight geometry.

## ADDED Requirements

### Requirement: Fabricate mode

The inspector SHALL expose a read-only Fabricate mode.

#### Scenario: Entry

- **WHEN** the user selects Fabricate
- **THEN** only fabrication source, health, units and export controls are shown
- **AND** parameter/operator editors are not available

### Requirement: Source eligibility

Only a validated closed Mesh/Solid SHALL be exportable.

#### Scenario: Closed solid

- **WHEN** the active source is a validated solid
- **THEN** health and export controls are enabled

#### Scenario: Open surface

- **WHEN** the active source is an open surface/mesh
- **THEN** export is disabled
- **AND** the reason is shown

### Requirement: Health readout

The mode SHALL show validation health, geometry counts, volume and physical
bounds.

#### Scenario: Valid source

- **WHEN** the source validates
- **THEN** the mode shows triangle/vertex counts, volume and physical bbox
- **AND** warnings such as unchecked self-intersection are visible

### Requirement: Units

Physical export SHALL require an explicit physical scale.

#### Scenario: Unitless

- **WHEN** the document is unitless
- **THEN** export remains disabled until a scale is configured

### Requirement: Export

The mode SHALL export binary STL only after validation.

#### Scenario: Export

- **WHEN** the user exports a valid source
- **THEN** the STL uses the physical scale
- **AND** the source geometry is not mutated

### Requirement: No CAD

The mode SHALL NOT edit geometry or offer repair/CSG.

#### Scenario: Unsupported action

- **WHEN** the user needs caps, repair or booleans
- **THEN** the mode reports that these are not available
- **AND** does not silently modify the source
