## ADDED Requirements

### Requirement: 3D readout mode

Viewport coordinates SHALL support a 3D surface-hit readout.

#### Scenario: Mode

- **WHEN** the active projection is 3D
- **THEN** the readout uses the existing surface picker
- **AND** orthographic depth-unknown behavior remains unchanged

### Requirement: Export isolation

Pinned and 3D readouts SHALL remain UI-only.

#### Scenario: Export

- **WHEN** SVG, plotter, PNG or GIF is exported
- **THEN** no readout or pin state is included
