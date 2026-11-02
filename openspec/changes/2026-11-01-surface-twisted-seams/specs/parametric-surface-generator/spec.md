## ADDED Requirements

### Requirement: Surface seam modes

The generator SHALL expose independent seam modes for closed U and V axes.

#### Scenario: Normal seam

- **WHEN** a closed axis uses the `normal` seam mode
- **THEN** its first and last sampled coordinates are identified index-to-index
- **AND** the existing closed-surface behaviour is unchanged

#### Scenario: Reversed seam

- **WHEN** a closed axis uses the `reverse` seam mode
- **THEN** the seam is identified with the opposite coordinate mirrored
- **AND** the Surface metadata records the seam mode

#### Scenario: Open axis

- **WHEN** an axis is open
- **THEN** its seam mode is ignored
- **AND** validation reports a warning if `reverse` was requested

#### Scenario: Default documents

- **WHEN** an existing document does not contain seam modes
- **THEN** both seams resolve to `normal`
- **AND** no document migration is required
