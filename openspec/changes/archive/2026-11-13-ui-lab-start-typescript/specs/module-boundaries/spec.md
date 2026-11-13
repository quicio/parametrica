## ADDED Requirements

### Requirement: Typed lab panel

The lab observation panel SHALL be strict TypeScript.

#### Scenario: Analyze

- **WHEN** metrics or sensitivity are rendered
- **THEN** descriptors, entries and states are typed
- **AND** metric values and ranking are unchanged

### Requirement: Typed start-with chooser

The start-with overlay SHALL be strict TypeScript.

#### Scenario: Choose

- **WHEN** a starting document is chosen or cancelled
- **THEN** choices, cards, dialog results and focus are typed
- **AND** modal copy, focus trap and previews are unchanged

### Requirement: Lab/start compatibility

The old `ui/widgets/LabPanel.js` and `ui/StartWithOverlay.js` paths SHALL keep
resolving.

#### Scenario: Import

- **WHEN** Controls starts the overlay or panel
- **THEN** compatibility re-exports resolve
- **AND** architecture port checks read the typed modules
