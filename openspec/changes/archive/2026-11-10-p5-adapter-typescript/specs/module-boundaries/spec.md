## ADDED Requirements

### Requirement: Typed p5 adapter

The p5 rendering backend SHALL be strict TypeScript.

#### Scenario: Sketch and canvas

- **WHEN** p5 mounts, resizes or draws a frame
- **THEN** the p5 context, canvas, app, document, evaluation and scene are typed
- **AND** drawing order and artboard framing are unchanged

#### Scenario: Capture and thumbnails

- **WHEN** PNG data, thumbnails or RGBA frames are captured
- **THEN** crop, canvas and frame buffers are typed
- **AND** output sizes and capture mode are unchanged

#### Scenario: Camera and coordinates

- **WHEN** the user drags/zooms or coordinates are pinned/read
- **THEN** camera state, canvas points and pins are typed
- **AND** gating and readout behavior are unchanged

### Requirement: p5 adapter compatibility

The old `render/p5/P5Adapter.js` path SHALL keep resolving.

#### Scenario: Import

- **WHEN** composition or tests import the old path
- **THEN** a compatibility re-export resolves
- **AND** behavior is unchanged
