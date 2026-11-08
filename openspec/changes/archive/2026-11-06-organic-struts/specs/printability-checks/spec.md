## ADDED Requirements

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
