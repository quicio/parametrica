## ADDED Requirements

### Requirement: Typed application seam

The animation transport and fabrication job boundary SHALL be strict TypeScript.

#### Scenario: Animation

- **WHEN** playback advances
- **THEN** time and speed are narrowed from unknown
- **AND** paused playback returns null

#### Scenario: Worker

- **WHEN** a heavy fabrication job runs
- **THEN** worker messages, progress and reports are typed
- **AND** the synchronous fallback uses the same contract

### Requirement: Compatibility during application migration

Old application `.js` imports SHALL keep resolving.

#### Scenario: Import

- **WHEN** a worker, panel or test imports the old path
- **THEN** a compatibility re-export resolves
- **AND** behavior is unchanged
