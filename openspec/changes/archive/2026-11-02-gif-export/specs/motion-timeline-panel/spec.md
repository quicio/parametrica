## ADDED Requirements

### Requirement: GIF export

The system SHALL export the active timeline as a single animated GIF using
the same duration/FPS frame contract as the PNG frame sequence, with GIF
playback capped at 50 FPS.

#### Scenario: Export a timeline loop

- **WHEN** the timeline duration is 6 s, FPS is 24 and loop is enabled
- **THEN** the GIF contains 144 frames
- **AND** the maximum side is 360 px, preserving the artboard aspect ratio
- **AND** the GIF loops forever
- **AND** the current playhead and playing state are restored afterwards

#### Scenario: Single pass

- **WHEN** the timeline loop is disabled
- **THEN** the GIF plays once instead of repeating forever

#### Scenario: Capture fidelity

- **WHEN** the GIF is exported
- **THEN** each frame uses the same artboard background, layers, styles,
  projection and active render passes as PNG capture
- **AND** the UI reference underlay is excluded
- **AND** no frame leaves the document at the exported time

#### Scenario: Frame cap

- **WHEN** `round(duration × fps)` exceeds 240 frames
- **THEN** the export is rejected with a visible timeline status
- **AND** the document and timeline remain unchanged

#### Scenario: Encoder failure

- **WHEN** a frame cannot be captured or encoded
- **THEN** the timeline status reports the failure
- **AND** the playhead and playing state are still restored
