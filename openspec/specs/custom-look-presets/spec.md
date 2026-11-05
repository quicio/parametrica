# custom-look-presets Specification

## Purpose
Let users keep visual recipes without saving a document.
## Requirements
### Requirement: Save a look

The user SHALL be able to save the current view appearance as a named look.

#### Scenario: Save

- **WHEN** the user saves a named look
- **THEN** passes, overlays, color metric, guides and pass opacity are stored
- **AND** geometry, style, units, camera and fabrication are not stored

#### Scenario: Built-in name

- **WHEN** the name matches a built-in look
- **THEN** the save is rejected

### Requirement: Apply and delete

User looks SHALL be applied and deleted explicitly.

#### Scenario: Apply

- **WHEN** the user applies a saved look
- **THEN** view-level appearance is updated
- **AND** geometry/style/units are unchanged

#### Scenario: Delete

- **WHEN** the user deletes a saved look
- **THEN** it is removed from local storage
- **AND** built-ins remain intact

### Requirement: Storage safety

Corrupt or unavailable storage SHALL NOT break the Looks section.

#### Scenario: Corrupt entry

- **WHEN** a stored look is invalid
- **THEN** it is ignored
- **AND** valid looks remain available

