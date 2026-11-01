## Purpose

Presents the preset catalog as a grouped, searchable and keyboard-accessible
visual library that helps users recognise and reopen forms quickly.

## ADDED Requirements

### Requirement: Grouped preset catalog

The browser SHALL keep the shipped catalog organisation while adding visual
previews and usage filters.

#### Scenario: Categories

- **WHEN** the Presets section opens
- **THEN** presets are grouped by category with counts
- **AND** each preset shows its name, description and generator badge

#### Scenario: Search

- **WHEN** the user searches
- **THEN** matching is case- and accent-insensitive across names,
  descriptions, tags, generators and categories
- **AND** the search composes with the active filter

#### Scenario: Active preset

- **WHEN** the current document corresponds to a preset
- **THEN** that preset is visually marked as active
- **AND** the state is exposed to assistive technology

### Requirement: Visual preset rows

Each preset row SHALL combine a preview, identifying text and a favorite
control.

#### Scenario: Thumbnail row

- **WHEN** a preset row is rendered
- **THEN** it shows a preview thumbnail, name, description and generator badge
- **AND** a separate star control

#### Scenario: Loading and fallback

- **WHEN** a preview is still being generated
- **THEN** the row shows a fixed-size placeholder
- **AND** the row does not change height when the image replaces it
- **AND** a failed preview leaves the placeholder in place

#### Scenario: Lazy previews

- **WHEN** the Presets section opens
- **THEN** previews are generated only for rows near the visible area
- **AND** the section remains responsive while they load

### Requirement: Special filters and empty states

The browser SHALL expose Favorites and Recent alongside categories.

#### Scenario: Favorites filter

- **WHEN** the user selects Favorites
- **THEN** only favorited presets are listed
- **AND** the filter reports its count

#### Scenario: Recent filter

- **WHEN** the user selects Recent
- **THEN** presets are listed in recency order
- **AND** the filter reports its count

#### Scenario: Empty favorites

- **WHEN** no preset is favorited
- **THEN** the Favorites view explains how to add one
- **AND** the rest of the library remains usable

#### Scenario: Empty recents

- **WHEN** no preset has been opened yet
- **THEN** the Recent filter is not shown
- **AND** the all-presets view remains the default

#### Scenario: Removal from a filtered view

- **WHEN** the user unstars the last visible favorite or deletes a user preset
  from a filtered view
- **THEN** the list updates immediately
- **AND** focus moves to the next row or the active filter control

### Requirement: Browser accessibility

The preset browser SHALL be operable without a pointer.

#### Scenario: Keyboard navigation

- **WHEN** the user tabs through a preset row
- **THEN** focus reaches the apply control and then the star control
- **AND** both activate with Enter or Space

#### Scenario: Star semantics

- **WHEN** the user focuses a star
- **THEN** its label identifies the preset and the action
- **AND** its pressed state reflects whether it is favorited

#### Scenario: Decorative previews

- **WHEN** a row is announced
- **THEN** the preview image is decorative
- **AND** the preset name is the accessible label for the row

#### Scenario: Status updates

- **WHEN** the active filter, search results or usage state changes
- **THEN** the status text updates in a polite live region

### Requirement: Browsing does not mutate the figure

Exploring, searching, favouriting or previewing presets SHALL not change the
active document.

#### Scenario: Browse without applying

- **WHEN** the user searches, changes filters, stars a preset or scrolls the
  library
- **THEN** the active generator, parameters, view and history are unchanged
- **AND** only applying a preset changes the document
