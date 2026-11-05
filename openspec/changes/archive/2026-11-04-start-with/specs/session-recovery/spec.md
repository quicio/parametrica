## MODIFIED Requirements

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
