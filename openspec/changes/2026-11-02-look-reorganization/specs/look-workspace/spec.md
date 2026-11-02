## Purpose

Defines a LOOK workspace organized around camera, canvas, active-layer style,
render passes and overlays, with explicit scope and a clearly temporary home
for ingest/time tools until their relocation is decided.

## ADDED Requirements

### Requirement: LOOK section ownership

LOOK SHALL be organized into Camera, Canvas, Style, Render and Overlays
sections.

#### Scenario: Section split

- **WHEN** the user opens LOOK
- **THEN** camera/viewport controls are in Camera
- **AND** artboard/background/margin controls are in Canvas
- **AND** active-layer stroke/fill/blend/palette controls are in Style
- **AND** render-pass controls are in Render
- **AND** diagnostic overlays are in Overlays

#### Scenario: No mixed canvas/style section

- **WHEN** the user changes artboard size, background or margin
- **THEN** those controls are identified as global canvas controls
- **AND** they are not mixed with active-layer style controls

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

### Requirement: Temporary Work group

Image, Animation and Timeline SHALL remain clearly marked as temporary Work
tools until their relocation is approved.

#### Scenario: Work group

- **WHEN** LOOK contains Image, Animation or Timeline
- **THEN** they are grouped under a visible Work label
- **AND** they are not presented as appearance controls

#### Scenario: Phase 2 relocation

- **WHEN** a relocation decision is approved
- **THEN** the Work group can be removed without changing the Camera, Canvas,
  Style, Render or Overlays contracts

### Requirement: UI state compatibility

The section split SHALL NOT break the persisted mode or unrelated accordion
state.

#### Scenario: Old section ids

- **WHEN** stored UI state contains the old `view` or `artboard` ids
- **THEN** the new sections open/close with defaults or a documented mapping
- **AND** the selected mode remains valid
- **AND** unknown section ids are ignored
