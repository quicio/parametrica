# render-scene-separation Specification

## Purpose
TBD - created by archiving change 2026-11-01-world-view-geometry. Update Purpose after archive.
## Requirements
### Requirement: RenderScene boundary

The renderer SHALL consume a prepared `RenderScene`, not the document or App.

#### Scenario: Scene contents

- **WHEN** the application builds a frame
- **THEN** it supplies artboard, view, layers, styles and overlays
- **AND** each layer contains projected render items

#### Scenario: No business state

- **WHEN** the renderer draws a frame
- **THEN** it does not read `document.generator`, `document.operators`, notebook
  or history
- **AND** it does not mutate the document

### Requirement: Renderer interface

The rendering backend SHALL implement a stable interface.

#### Scenario: p5 adapter

- **WHEN** p5 is the active backend
- **THEN** `P5Adapter` implements mount, resize, render, capture and destroy
- **AND** replacing the backend does not require changing generators

### Requirement: Camera controller

Pointer and wheel camera input SHALL be handled outside the renderer.

#### Scenario: Orbit

- **WHEN** the user drags over the canvas in 3D view
- **THEN** the camera controller updates view state
- **AND** the renderer only receives the new scene

#### Scenario: Orthographic view

- **WHEN** projection is `xy`, `xz` or `yz`
- **THEN** camera drag does not change yaw or pitch

### Requirement: Animation controller

Playback timing SHALL be owned by an animation controller, not by the p5 draw
routine.

#### Scenario: Play

- **WHEN** playback starts
- **THEN** the controller advances time and requests evaluation only when the
  document depends on time
- **AND** the renderer only renders the resulting scene

### Requirement: Render passes

Render passes SHALL consume RenderScene data.

#### Scenario: Existing pass

- **WHEN** a stroke pass receives a projected polyline
- **THEN** it draws it without reading the document

#### Scenario: Generator-specific pass

- **WHEN** a pass depends on a generator-specific feature
- **THEN** that dependency is declared through pass metadata or capabilities
- **AND** not through hardcoded generator id checks

