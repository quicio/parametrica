# physical-units Specification

## Purpose
Make physical scale explicit for plotter and fabrication consumers without
changing canonical geometry.
## Requirements
### Requirement: Optional unit metadata

The document SHALL support optional world and artboard physical units.

#### Scenario: Legacy document

- **WHEN** a document has no unit metadata
- **THEN** it remains unitless
- **AND** existing plotter/SVG output is unchanged

#### Scenario: Physical document

- **WHEN** units are enabled
- **THEN** world and artboard units and conversion factors are explicit
- **AND** invalid/non-positive factors are rejected

### Requirement: Geometry invariance

Changing units SHALL NOT rescale or mutate canonical geometry.

#### Scenario: Unit change

- **WHEN** the user changes the physical scale
- **THEN** world vertices, tessellation, SurfaceMapping, frame and bbox remain
  unchanged

### Requirement: Explicit conversion

World→mm and artboard→mm SHALL use separate conversion factors.

#### Scenario: World export

- **WHEN** a fabrication consumer requests millimetres
- **THEN** it uses `mmPerWorldUnit`
- **AND** it never assumes one world unit equals one millimetre

#### Scenario: Page export

- **WHEN** a plotter consumer requests physical page dimensions
- **THEN** it uses `mmPerArtboardUnit`
- **AND** the artboard viewBox remains stable

### Requirement: Honest unitless output

A consumer SHALL NOT claim millimetres when units are unitless or incomplete.

#### Scenario: Missing scale

- **WHEN** physical world scale is absent
- **THEN** fabrication output is rejected or marked unitless
- **AND** no implicit conversion is applied

### Requirement: UI

The UI SHALL expose unit mode, scale and computed physical dimensions.

#### Scenario: Scale readout

- **WHEN** physical units are active
- **THEN** the user can see the physical bounding size
- **AND** changing units does not move or resize the artwork in artboard space

