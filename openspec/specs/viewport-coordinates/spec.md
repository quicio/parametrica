# viewport-coordinates Specification

## Purpose
Give each viewport panel an explicit world-axis model and a UI-only coordinate
overlay for orthographic planes, without changing geometry or exports.
## Requirements
### Requirement: Viewport descriptor

The system SHALL derive a pure descriptor for every viewport panel.

#### Scenario: Orthographic axes

- **WHEN** the projection is XY
- **THEN** horizontal is X and vertical is Y
- **AND** depth is Z

#### Scenario: XZ and YZ axes

- **WHEN** the projection is XZ
- **THEN** horizontal is X, vertical is Z and depth is Y
- **AND** when the projection is YZ
- **THEN** horizontal is Y, vertical is Z and depth is X

#### Scenario: Axis signs

- **WHEN** a screen axis runs opposite to its world axis
- **THEN** the descriptor records a negative sign
- **AND** ticks and labels preserve world sign rather than relabeling it

#### Scenario: 3D

- **WHEN** the projection is the 3D camera
- **THEN** the descriptor exposes origin and axes
- **AND** no constant world-scale tick or pointer coordinate is claimed

### Requirement: Coordinate grid and ticks

The overlay SHALL show optional numeric ticks and grid lines in orthographic
panels.

#### Scenario: Auto spacing

- **WHEN** coordinate ticks are enabled with automatic spacing
- **THEN** a 1/2/5 × 10^n world step is chosen for legible spacing
- **AND** values remain finite

#### Scenario: Manual spacing

- **WHEN** the user enters a finite positive step
- **THEN** ticks use that world interval
- **AND** invalid steps fall back to automatic spacing

#### Scenario: Units

- **WHEN** physical world units are configured
- **THEN** tick values can be displayed in millimetres
- **AND** unitless documents never claim millimetres
- **AND** displaying units never rescales geometry

#### Scenario: Clipping

- **WHEN** a panel is smaller than the tick extent
- **THEN** ticks and grid lines are clipped to that panel

### Requirement: Cursor readout

The overlay SHALL report cursor coordinates for the active orthographic plane.

#### Scenario: XY

- **WHEN** the pointer is over an XY panel
- **THEN** X and Y are reported from the pointer
- **AND** Z is reported as unknown

#### Scenario: XZ and YZ

- **WHEN** the pointer is over XZ
- **THEN** X and Z are reported and Y is unknown
- **AND** when the pointer is over YZ
- **THEN** Y and Z are reported and X is unknown

#### Scenario: Quad routing

- **WHEN** Quad is active
- **THEN** the readout uses the panel under the pointer

#### Scenario: No inferred depth

- **WHEN** the dropped axis is not determined
- **THEN** the readout shows an unknown marker
- **AND** no depth is invented

### Requirement: Look Coordinates section

Look SHALL expose a Coordinates section for reference and coordinate display.

#### Scenario: Controls

- **WHEN** the user opens Coordinates
- **THEN** Reference, Ground, grid, ticks, cursor readout, step and unit display
  are available
- **AND** the section identifies its scope as global viewport

#### Scenario: Canvas boundary

- **WHEN** the user opens Canvas
- **THEN** artboard, background, margin, UV Domain, Inspect and Seams remain
- **AND** Reference and Ground are not duplicated there

### Requirement: Configuration and compatibility

Coordinate display SHALL be optional, sanitized and off by default.

#### Scenario: Legacy document

- **WHEN** a document has no `view.coordinates`
- **THEN** the coordinate overlay is disabled
- **AND** the document remains valid

#### Scenario: Round-trip

- **WHEN** coordinate settings are edited
- **THEN** they survive document sanitization
- **AND** unknown values fall back safely

### Requirement: Geometry and export isolation

The coordinate overlay SHALL NOT change geometry, framing or exports.

#### Scenario: Toggle

- **WHEN** the overlay is enabled or disabled
- **THEN** world vertices, frame, bbox and SurfaceMapping are unchanged

#### Scenario: Exports

- **WHEN** SVG, plotter, PNG or GIF is exported
- **THEN** no coordinate overlay markup or pixels are included

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

