# look-workspace Specification

## Purpose
Defines a LOOK workspace organized around camera, canvas, active-layer style,
render passes and overlays, with explicit scope. Ingest owns image tools and
Perform owns animation, timeline and temporal export.
## Requirements
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

### Requirement: Scope is explicit

Controls SHALL state whether they affect the viewport, the document, the active
layer or the session/workspace.

#### Scenario: Active-layer style

- **WHEN** the user edits stroke, fill, blend or palette
- **THEN** the UI identifies the control as affecting the active layer
- **AND** changing the active layer updates the displayed style values

#### Scenario: Global view and canvas

- **WHEN** the user edits projection, guides, camera, artboard or overlays
- **THEN** the UI identifies the control as global/viewport
- **AND** it does not imply that it applies only to the active layer

#### Scenario: Active-layer style alias

- **WHEN** the Style section is displayed
- **THEN** `view.style` remains the active layer's style
- **AND** no duplicate global style is introduced
- **AND** the section is labelled as active-layer style

### Requirement: Camera controls

Camera SHALL expose projection, guides and an explicit reset action.

#### Scenario: Reset camera

- **WHEN** the user activates Reset camera in the 3D projection
- **THEN** yaw, pitch and FOV return to the documented defaults
- **AND** the canvas updates
- **AND** the action is undoable through the existing history/rebuild path

#### Scenario: Orthographic view

- **WHEN** the active projection is orthographic
- **THEN** the camera reset is disabled or hidden
- **AND** projection/guides remain available

#### Scenario: Projection capability

- **WHEN** the active layer is 2D
- **THEN** orthographic projection remains gated/disabled
- **AND** when enabled the chosen projection still applies globally

### Requirement: Render pass browser

Render SHALL group passes by intent and explain their purpose.

#### Scenario: Grouped passes

- **WHEN** the Render section is displayed
- **THEN** passes appear under base, surface, color and diagnostic groups
- **AND** each pass exposes a short description

#### Scenario: Applicability preserved

- **WHEN** a pass cannot run on the visible geometry
- **THEN** the existing applicability behavior still disables or omits it
- **AND** the active state remains truthful

### Requirement: Color ramp exposure

Render SHALL expose the existing `view.colorRamp` setting.

#### Scenario: Ramp editing

- **WHEN** the user edits the color ramp
- **THEN** stops can be changed and reset
- **AND** the change is visible in Gradient Wireframe
- **AND** it persists in the document

#### Scenario: Scope

- **WHEN** the ramp is edited
- **THEN** the UI identifies it as the current global/view ramp
- **AND** per-layer or per-pass ramps are not implied

#### Scenario: Palette independence

- **WHEN** a palette is applied
- **THEN** the color ramp is unchanged
- **AND** editing the ramp does not change the palette
- **AND** no implicit synchronization is introduced

### Requirement: UI state compatibility

The section split SHALL NOT break the persisted mode or unrelated accordion
state.

#### Scenario: Old section ids

- **WHEN** stored UI state contains the old `view` or `artboard` ids
- **THEN** the new sections open/close with defaults or a documented mapping
- **AND** the selected mode remains valid
- **AND** unknown section ids are ignored

### Requirement: Ingest and Perform ownership

Image SHALL live in Ingest. Animation and Timeline SHALL live in Perform.
Frame and GIF export SHALL remain with Timeline in Perform. KEEP SHALL remain
the workspace for final-artifact conservation and export.

#### Scenario: Image ownership

- **WHEN** the user opens Image
- **THEN** Ingest is the active mode
- **AND** Look is not required to reach Image

#### Scenario: Time ownership

- **WHEN** the user opens Animation or Timeline
- **THEN** Perform is the active mode
- **AND** the timeline frame/GIF export controls remain in Timeline

#### Scenario: Look is appearance-only

- **WHEN** Look is active
- **THEN** Image, Animation and Timeline are not visible
- **AND** the temporary Work group is absent

#### Scenario: Keep boundary

- **WHEN** the user opens Keep
- **THEN** Notebook, Presets and Export remain available
- **AND** temporal frame/GIF export is not duplicated there

### Requirement: Render pass control semantics

Render SHALL expose one unambiguous on/off control per pass and a separately
labeled opacity control.

#### Scenario: Enable and opacity

- **WHEN** a pass is off
- **THEN** its opacity control is disabled
- **AND** when the pass is on
- **THEN** opacity is enabled and shows its current percentage

#### Scenario: Unavailable pass

- **WHEN** a pass cannot apply to the active visible geometry
- **THEN** its on/off control is disabled
- **AND** the row shows an unavailable state and a reason
- **AND** it is not silently removed from the configured pass list

### Requirement: Applicability visibility

Controls that cannot affect the active layer SHALL be disabled with a reason.

#### Scenario: Surface-only Canvas controls

- **WHEN** the active layer has no surface or mesh
- **THEN** UV Domain, Inspect and Seams are disabled
- **AND** the UI explains that they require surface geometry

#### Scenario: Coordinates on non-spatial layers

- **WHEN** the active layer has no spatial transform
- **THEN** Coordinates controls are disabled
- **AND** the UI explains that they require spatial geometry

### Requirement: Looks section

Look SHALL expose built-in visual presets in a Looks section.

#### Scenario: Ownership

- **WHEN** the user opens Looks
- **THEN** preset selection and reset are available
- **AND** the controls are identified as view/appearance settings

