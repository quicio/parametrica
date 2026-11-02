## Purpose

Detect fully enclosed background regions as editable contour layers during
all-contours image tracing.

## ADDED Requirements

### Requirement: Internal hole detection

All-contours tracing SHALL identify background components that do not touch the
image border and trace them as hole contours.

#### Scenario: Ring silhouette

- **WHEN** an image contains a dark ring on a light background
- **THEN** tracing finds the outer contour and one internal hole
- **AND** the hole result is marked `hole: true`

#### Scenario: Border background

- **WHEN** a background component touches the image border
- **THEN** it is not treated as a hole

### Requirement: Hole layers

Applying a trace with holes SHALL create editable Fourier layers for them.

#### Scenario: Apply a ring

- **WHEN** the user applies a two-contour ring trace
- **THEN** two Fourier layers are created
- **AND** the hole layer is explicitly named

### Requirement: Default and bounds

Hole detection SHALL only apply to all-contours mode and share its bounds.

#### Scenario: Largest default

- **WHEN** All contours is off
- **THEN** only the largest outer contour is traced
- **AND** hole detection is not applied

#### Scenario: Many components

- **WHEN** holes and outer contours exceed the contour cap
- **THEN** the bounded selection is respected

### Requirement: Explicit fill limitation

Holes SHALL be represented as contour outlines, not even-odd filled regions.

#### Scenario: Fill

- **WHEN** a hole contour is applied
- **THEN** it remains an editable Fourier curve
- **AND** no compound even-odd fill is implied
