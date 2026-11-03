## ADDED Requirements

### Requirement: Seam semantics

The visualization SHALL distinguish open domain borders, declared closed seams
and reverse/twist seams.

#### Scenario: Open axis

- **WHEN** an axis is open
- **THEN** both domain ends are drawn as borders

#### Scenario: Closed axis

- **WHEN** an axis is closed
- **THEN** one declared seam is drawn at its logical end
- **AND** the start end is not duplicated

#### Scenario: Reverse seam

- **WHEN** a closed axis uses a reverse seam
- **THEN** the seam is marked as a twist
- **AND** no orientation or pairing is implied

### Requirement: Rigor

The overlay SHALL NOT claim geometric continuity.

#### Scenario: Declared only

- **WHEN** a seam is closed
- **THEN** the legend says `declared`
- **AND** no continuity/crack-free claim is made

### Requirement: Degraded data

Missing, malformed or degenerate mappings SHALL NOT produce invented seams.

#### Scenario: Missing mapping

- **WHEN** mapping is unavailable
- **THEN** no seam edges are drawn
- **AND** the legend reports unavailable

#### Scenario: Malformed mapping

- **WHEN** some mapping faces are invalid
- **THEN** valid edges may be shown as partial data
- **AND** invalid faces do not produce edges

### Requirement: Seam overlay isolation

Seam overlays SHALL be UI-only, single-Canvas and excluded from exports.

#### Scenario: Quad

- **WHEN** Quad is active
- **THEN** no seam overlay or legend is shown

#### Scenario: Export

- **WHEN** SVG, plotter, PNG or GIF output is generated
- **THEN** seam overlays are absent
