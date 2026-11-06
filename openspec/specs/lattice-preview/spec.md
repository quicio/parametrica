# lattice-preview Specification

## Purpose
Let Fabricate show the prepared lattice body in the canvas without changing
the authored document or the exported geometry.
## Requirements
### Requirement: Network/Solid preview

Fabricate SHALL offer a persisted Network/Solid preview choice.

#### Scenario: Default

- **WHEN** a lattice report becomes ready in Fabricate
- **THEN** the canvas shows the prepared solid
- **AND** the Preview select reads `Solid`

#### Scenario: Network

- **WHEN** the user selects Network
- **THEN** the canvas draws the authored strut centerlines
- **AND** no prepared mesh is injected

#### Scenario: Solid

- **WHEN** the user selects Solid
- **THEN** the active layer renders the prepared mesh
- **AND** the render uses the lattice preview pass

### Requirement: Display-only simplification

The solid preview SHALL be allowed to simplify the display mesh.

#### Scenario: Dense body

- **WHEN** the prepared mesh is dense
- **THEN** the canvas may use a simplified display mesh
- **AND** STL/3MF export continues to use the full-resolution source

### Requirement: Responsive preview

The preview SHALL not block camera interaction.

#### Scenario: Drag

- **WHEN** the pointer drags the canvas
- **THEN** the canvas falls back to the network preview
- **AND** the solid returns when the drag ends

#### Scenario: Playback

- **WHEN** the timeline is playing
- **THEN** the canvas uses the network preview
- **AND** playback stays responsive

### Requirement: View-only toggle

Changing the preview SHALL NOT rebuild the fabricated body.

#### Scenario: Toggle

- **WHEN** the Preview select changes
- **THEN** the current report is kept
- **AND** the worker job is not rescheduled

