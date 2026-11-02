# panel-modes Specification

## Purpose
Defines the six workspace modes, their section ownership, persistence and
accessible state.
## Requirements
### Requirement: Workspace modes

The inspector SHALL expose Form, Look, Explore, Perform, Ingest and Keep
modes.

#### Scenario: Default mode

- **WHEN** the app loads without saved UI state
- **THEN** Form is active and only form sections are visible

#### Scenario: Switch mode

- **WHEN** the user selects a mode
- **THEN** sections belonging to that mode are visible
- **AND** sections belonging to other modes are hidden

#### Scenario: Look mode

- **WHEN** the user selects Look
- **THEN** Camera, Canvas, Style, Render and Overlays are visible
- **AND** Image, Animation and Timeline are hidden

#### Scenario: Perform mode

- **WHEN** the user selects Perform
- **THEN** Animation and Timeline are visible
- **AND** frame ZIP and GIF export remain available in Timeline

#### Scenario: Ingest mode

- **WHEN** the user selects Ingest
- **THEN** Image is visible
- **AND** Look appearance sections are hidden

#### Scenario: Keep mode

- **WHEN** the user selects Keep
- **THEN** Notebook, Presets and Export are visible
- **AND** form, look, explore, perform and ingest sections are hidden

#### Scenario: Persistence

- **WHEN** the user reloads after changing mode
- **THEN** the same valid mode is restored

#### Scenario: Legacy mode

- **WHEN** saved UI state contains a `work` mode
- **THEN** it is treated as Perform

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

