## ADDED Requirements

### Requirement: Grouped object set

Fabricate SHALL include a multi-body set built from independent boolean groups.

#### Scenario: Lampshade ring set

- **WHEN** `Lampshade Ring Set` is loaded
- **THEN** it contains three concentric open shades
- **AND** each shade is a 2 mm hollow shell
- **AND** Fabricate reports three bodies and three groups
- **AND** 3MF exports three separate objects

### Requirement: Stackable object

Fabricate SHALL include a stackable tray with a locating lip.

#### Scenario: Stackable tray

- **WHEN** `Stackable Tray 160` is loaded
- **THEN** it is a 160 × 90 mm rounded shell with a 3 mm wall
- **AND** its top lip widens by 4 mm
- **AND** it is exportable with positive bed contact
- **AND** the overhang ratio stays below 20%
