# orbit-camera Specification

## Purpose
Give 3D scenes a true orbit camera so a figure can be inspected from any
direction while the world's vertical axis stays upright on screen.
## Requirements
### Requirement: Spherical orbit

The 3D camera SHALL orbit the world origin at radius `fov` around the vertical
Z axis.

#### Scenario: Yaw

- **WHEN** the user drags horizontally
- **THEN** the eye moves around the world Z axis
- **AND** the full `[-π, π]` yaw range is reachable

#### Scenario: Pitch

- **WHEN** the user drags vertically
- **THEN** the eye rises above or falls below the XY plane
- **AND** pitch clamps before the poles

#### Scenario: Vertical axis

- **WHEN** any 3D scene is projected
- **THEN** world +Z is vertical on screen
- **AND** the figure stays upright as yaw changes

### Requirement: Full-sphere inspection

The camera SHALL allow viewing the top and bottom of an object.

#### Scenario: Top

- **WHEN** pitch approaches its positive limit
- **THEN** the eye is above the object
- **AND** the top of the object is nearer than its bottom

#### Scenario: Bottom

- **WHEN** pitch approaches its negative limit
- **THEN** the eye is below the object
- **AND** the bottom is nearer than its top

### Requirement: Projection contract

`project3D` SHALL keep its existing output contract: screen coordinates,
normalized depth and depth alpha, with points behind the camera clipped.

#### Scenario: Near plane

- **WHEN** a point is behind the camera
- **THEN** the projection returns null
- **AND** visible curves are split into finite runs

### Requirement: Picking matches projection

The picking ray SHALL invert the same orbit projection used to draw.

#### Scenario: Round trip

- **WHEN** a world point is projected and the resulting screen point is turned
  back into a ray
- **THEN** the ray passes through the original world point

### Requirement: View-only camera

Changing the camera SHALL NOT change world geometry, bbox or fit.

#### Scenario: Orbit

- **WHEN** yaw or pitch changes
- **THEN** the world geometry and bbox stay identical
- **AND** only the projected view changes

