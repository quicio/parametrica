## ADDED Requirements

### Requirement: Workspace modes

The inspector SHALL expose Form, Look, Explore and Keep modes.

#### Scenario: Default mode

- **WHEN** the app loads without saved UI state
- **THEN** Form is active and only form sections are visible

#### Scenario: Switch mode

- **WHEN** the user selects Keep
- **THEN** Notebook, Presets and Export are visible and form sections are hidden

#### Scenario: Persistence

- **WHEN** the user reloads after changing mode
- **THEN** the same mode is restored

### Requirement: Accordion sections

Every section header SHALL be a button that expands or collapses its body.

#### Scenario: Default disclosure

- **WHEN** the panel is built
- **THEN** Generator and Parameters are expanded
- **AND** other sections are collapsed

#### Scenario: Toggle

- **WHEN** the user activates a collapsed header
- **THEN** its body becomes visible and the state persists across reloads

### Requirement: Accessible state

Headers SHALL expose `aria-expanded` and controls, and mode buttons SHALL
expose the selected state.

#### Scenario: Keyboard

- **WHEN** a header or mode button receives keyboard activation
- **THEN** the same toggle/mode change occurs as with a pointer
