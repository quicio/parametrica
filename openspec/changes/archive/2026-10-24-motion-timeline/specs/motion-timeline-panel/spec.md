## Purpose

Make time a first-class editing surface: keyframes, easing, playback and
deterministic frame export.

## ADDED Requirements

### Requirement: Timeline model

The document SHALL support a versioned timeline with duration, loop and
per-parameter keyframe tracks.

#### Scenario: Keyframe interpolation

- **WHEN** a track has values 0 at t=0 and 10 at t=2
- **THEN** at t=1 with linear easing the resolved value is 5

#### Scenario: Loop

- **WHEN** loop is enabled and time reaches duration
- **THEN** playback wraps to 0 deterministically

### Requirement: Resolution precedence

Timeline values SHALL resolve before expression modulators, with deterministic
clamping to schema bounds.

#### Scenario: Clamped keyframe

- **WHEN** a keyframe exceeds the schema max
- **THEN** evaluation uses the max

### Requirement: Timeline UI

The user SHALL be able to add/remove keyframes and choose easing.

#### Scenario: Add a keyframe

- **WHEN** the user adds a keyframe at the playhead
- **THEN** a track is created or extended and the canvas updates

### Requirement: Gesture recording

The UI SHALL record a slider gesture into keyframes at the playhead.

#### Scenario: Record a drag

- **WHEN** the user records a slider drag
- **THEN** keyframes reflect the gesture and can be played back

### Requirement: Frame export

The system SHALL export a deterministic PNG frame sequence with a manifest.

#### Scenario: Export a loop

- **WHEN** duration is 6 s at 30 fps
- **THEN** 180 frames with exact timestamps are produced
