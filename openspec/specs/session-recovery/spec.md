# session-recovery Specification

## Purpose
TBD - created by archiving change tech-debt-hardening. Update Purpose after archive.
## Requirements
### Requirement: Automatic snapshots

The app SHALL debounce document snapshots to localStorage after commits.

#### Scenario: Edit and reload

- **WHEN** the user edits a document, waits for the debounce and reloads
- **THEN** a recoverable snapshot exists

#### Scenario: Playback

- **WHEN** a snapshot is written while animation is playing
- **THEN** the stored document has `animation.playing = false`

### Requirement: Safe failure

Corrupt snapshots and storage quota failures SHALL NOT throw into the app.

#### Scenario: Quota exceeded

- **WHEN** localStorage rejects a write
- **THEN** the app continues working and reports the storage failure

### Requirement: Automatic restore

On startup the app SHALL restore the last valid session document before first
paint when one exists. The restored state SHALL include the generator,
parameters, operators, layers, styles, view, units, coordinates and animation
time.

#### Scenario: Reload

- **WHEN** the user reloads after a document was saved
- **THEN** the restored document uses the last generator and parameters
- **AND** operators, layers, styles and view settings are restored
- **AND** animation does not start playing

#### Scenario: First run

- **WHEN** no valid snapshot exists
- **THEN** the app shows the Start With chooser
- **AND** the chosen document becomes the saved session

#### Scenario: Restore notice

- **WHEN** a session is restored
- **THEN** a short non-blocking notice reports the restoration
- **AND** no blocking Restore/Dismiss banner is shown

#### Scenario: History baseline

- **WHEN** the user presses undo immediately after startup
- **THEN** it does not revert to an unrelated default document

#### Scenario: Invalid snapshot

- **WHEN** the stored session cannot be sanitized
- **THEN** it is treated as no session
- **AND** the Start With chooser is shown
- **AND** the failure does not throw into the UI

### Requirement: Safe fallback

Corrupt snapshots and storage failures SHALL NOT prevent startup.

#### Scenario: Corrupt snapshot

- **WHEN** the stored session cannot be sanitized
- **THEN** the app starts with the default document
- **AND** the failure does not throw into the UI

