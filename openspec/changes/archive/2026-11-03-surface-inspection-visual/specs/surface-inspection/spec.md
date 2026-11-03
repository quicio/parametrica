## ADDED Requirements

### Requirement: Inspection overlay

Single Canvas SHALL show UI-only marker, triangle and cell highlights.

#### Scenario: Valid mapping

- **WHEN** a pick has a valid mapping
- **THEN** a marker, the selected triangle and the four-corner cell are drawn

#### Scenario: Missing mapping

- **WHEN** a pick has no mapping
- **THEN** the marker and triangle are drawn with an invalid style
- **AND** no cell is invented

### Requirement: Pin lifecycle

The inspector SHALL allow pinning and releasing a pick independently of hover.

#### Scenario: Pin

- **WHEN** the user pins a valid pick
- **THEN** hover no longer replaces the displayed result

#### Scenario: Release

- **WHEN** the user releases the pin
- **THEN** the current hover result is restored or a hover prompt appears

#### Scenario: Invalidated pin

- **WHEN** geometry, topology, active layer, projection, camera, frame, artboard
  or playback changes invalidate the pinned result
- **THEN** the pin is released
- **AND** no stale pick is displayed

### Requirement: Overlay isolation

Inspection overlays SHALL NOT enter RenderScene, exports or captures.

#### Scenario: Export

- **WHEN** SVG, plotter, PNG or GIF output is generated
- **THEN** inspection overlays are absent

### Requirement: Single view

Overlays SHALL remain single-Canvas only.

#### Scenario: Quad

- **WHEN** Quad is active
- **THEN** no inspection overlay is drawn
- **AND** the inspector reports single-view-only
