## MODIFIED Requirements

### Requirement: LOOK section ownership

LOOK SHALL be organized into Camera, Canvas, Coordinates, Scale, Style, Render
and Overlays sections.

#### Scenario: Section split

- **WHEN** the user opens LOOK
- **THEN** camera/viewport controls are in Camera
- **AND** artboard/background/margin/inspection controls are in Canvas
- **AND** reference, ground and coordinate-display controls are in Coordinates
- **AND** world/artboard physical scale controls are in Scale
- **AND** active-layer stroke/fill/blend/palette controls are in Style
- **AND** render-pass controls are in Render
- **AND** diagnostic overlays are in Overlays

#### Scenario: No mixed canvas/style section

- **WHEN** the user changes artboard size, background or margin
- **THEN** those controls are identified as global canvas controls
- **AND** they are not mixed with active-layer style controls

#### Scenario: No duplicated reference controls

- **WHEN** the user wants to enable origin, axes, ground or coordinate values
- **THEN** those controls live in Coordinates
- **AND** Canvas does not duplicate them
