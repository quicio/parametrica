## Purpose

Provide a minimal, UI-only world reference so spatial geometry has a visible
origin and axes without affecting composition or exports.

## ADDED Requirements

### Requirement: Configuration

Spatial reference configuration SHALL be optional, off by default and
sanitized with the view.

#### Scenario: Existing document

- **WHEN** a document without `view.reference` is loaded
- **THEN** the reference is disabled
- **AND** the document remains valid

#### Scenario: Ground

- **WHEN** the reference is enabled
- **THEN** the ground plane can be enabled independently

### Requirement: World origin and axes

The reference SHALL show the world origin and visible XYZ axes with labels.

#### Scenario: Perspective

- **WHEN** the scene uses the camera projection
- **THEN** all three axes are drawn from the world origin

#### Scenario: Orthographic

- **WHEN** an axis is perpendicular to an orthographic panel
- **THEN** its degenerate projection is omitted

### Requirement: Ground plane

The reference SHALL offer an optional ground plane with few divisions.

#### Scenario: Ground enabled

- **WHEN** the ground is enabled
- **THEN** a low-density grid is drawn at z = 0
- **AND** it does not change the artwork frame

### Requirement: Frame independence

Toggling the reference SHALL NOT change geometry, scale, position, bbox or fit.

#### Scenario: Toggle

- **WHEN** the user enables or disables the reference
- **THEN** the frame and bbox remain unchanged

### Requirement: Frame policies

The reference SHALL follow the scene frame policy.

#### Scenario: Scene mode

- **WHEN** frame mode is `scene`
- **THEN** the reference uses the shared scene transform

#### Scenario: Composition mode

- **WHEN** frame mode is `composition`
- **THEN** the reference follows the active spatial layer
- **AND** planar active layers have no reference transform

#### Scenario: World mode

- **WHEN** frame mode is `world`
- **THEN** the reference uses the world-anchored transform

### Requirement: Canvas and Quad

The reference SHALL render in Canvas and each Quad panel.

#### Scenario: Quad

- **WHEN** Quad is active
- **THEN** axes render in every panel
- **AND** ground renders only in the 3D and XY panels

### Requirement: Export isolation

The reference SHALL be excluded from SVG, plotter, PNG and GIF.

#### Scenario: Export

- **WHEN** the reference is visible
- **THEN** SVG and plotter output contain no reference markup
- **AND** PNG/GIF captures contain no reference

### Requirement: Separation from guides

The reference SHALL remain separate from artboard CAD guides.

#### Scenario: Guides

- **WHEN** CAD Guides are toggled
- **THEN** the spatial reference configuration is unchanged
