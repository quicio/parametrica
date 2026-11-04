## REMOVED Requirements

### Requirement: Explicit recovery

**Reason**: Startup now restores the last valid session automatically, so the
blocking Restore/Dismiss choice is no longer part of the UX.

## ADDED Requirements

### Requirement: Automatic restore

On startup the app SHALL restore the last valid session document before first
paint. The restored state SHALL include the generator, parameters, operators,
layers, styles, view, units, coordinates and animation time.

#### Scenario: Reload

- **WHEN** the user reloads after a document was saved
- **THEN** the restored document uses the last generator and parameters
- **AND** operators, layers, styles and view settings are restored
- **AND** animation does not start playing

#### Scenario: First run

- **WHEN** no valid snapshot exists
- **THEN** the app starts with the default document

#### Scenario: Restore notice

- **WHEN** a session is restored
- **THEN** a short non-blocking notice reports the restoration
- **AND** no blocking Restore/Dismiss banner is shown

#### Scenario: History baseline

- **WHEN** the user presses undo immediately after startup
- **THEN** it does not revert to an unrelated default document

### Requirement: Safe fallback

Corrupt snapshots and storage failures SHALL NOT prevent startup.

#### Scenario: Corrupt snapshot

- **WHEN** the stored session cannot be sanitized
- **THEN** the app starts with the default document
- **AND** the failure does not throw into the UI
