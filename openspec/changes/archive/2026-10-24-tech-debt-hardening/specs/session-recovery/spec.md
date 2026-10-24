## ADDED Requirements

### Requirement: Automatic snapshots

The app SHALL debounce document snapshots to localStorage after commits.

#### Scenario: Edit and reload

- **WHEN** the user edits a document, waits for the debounce and reloads
- **THEN** a recoverable snapshot exists

#### Scenario: Playback

- **WHEN** a snapshot is written while animation is playing
- **THEN** the stored document has `animation.playing = false`

### Requirement: Explicit recovery

On startup the app SHALL NOT silently replace the current document. It SHALL
offer Restore and Dismiss actions for a pending snapshot.

#### Scenario: Restore

- **WHEN** the user clicks Restore
- **THEN** the snapshot document is adopted and the banner disappears

#### Scenario: Dismiss

- **WHEN** the user clicks Dismiss
- **THEN** the snapshot is removed and the current document remains untouched

### Requirement: Safe failure

Corrupt snapshots and storage quota failures SHALL NOT throw into the app.

#### Scenario: Quota exceeded

- **WHEN** localStorage rejects a write
- **THEN** the app continues working and reports the storage failure
