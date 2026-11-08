# printability-checks Specification

## Purpose
Surface the printability facts a slicer would otherwise reveal: overhang
area, bed contact and minimum feature size.
## Requirements
### Requirement: Printability summary

Every Fabricate report SHALL include a printability summary.

#### Scenario: Overhang

- **WHEN** a prepared body has down-facing faces beyond 50°
- **THEN** their area is reported
- **AND** bed-contact faces are excluded

#### Scenario: Bed contact

- **WHEN** the body is prepared
- **THEN** the area touching the bed is reported
- **AND** a zero contact area warns

#### Scenario: Minimum feature

- **WHEN** the source knows its strut or wall size
- **THEN** the minimum feature is reported in millimetres
- **AND** a value below 2 mm warns

### Requirement: Non-blocking checks

Printability checks SHALL NOT block export.

#### Scenario: Warning

- **WHEN** a warning is present
- **THEN** the Fabricate checks list it
- **AND** the export button stays available if the body is valid

### Requirement: Lattice feature checks

The printability report SHALL include the measured lattice features when the
source is an organic lattice.

#### Scenario: Strut

- **WHEN** an organic lattice solid is checked
- **THEN** the measured minimum strut diameter is reported
- **AND** a value below the configured minimum warns

#### Scenario: Joint

- **WHEN** blended or rounded joints are present
- **THEN** the measured minimum joint diameter is reported
- **AND** a value below the configured minimum warns

#### Scenario: Opening

- **WHEN** the lattice has apertures
- **THEN** the minimum free opening width is measured (gauge)
- **AND** a value below the configured minimum warns
- **AND** opening area is reported as diagnostic only

#### Scenario: Overhang

- **WHEN** the organic joints create down-facing surfaces
- **THEN** their overhang area is included in the existing overhang check
- **AND** the result remains non-blocking unless the body is invalid

