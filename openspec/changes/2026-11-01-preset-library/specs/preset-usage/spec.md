## Purpose

Lets users keep a shortlist of presets and return to recently used forms
across sessions without changing any document or preset format.

## ADDED Requirements

### Requirement: Favorites

Users SHALL be able to mark and unmark any preset as a favorite without
applying it.

#### Scenario: Toggle a favorite

- **WHEN** the user stars a preset
- **THEN** the preset is added to favorites
- **AND** the active figure and preset selection do not change
- **AND** the star reports its pressed state

#### Scenario: Unfavorite

- **WHEN** the user unstars a favorite
- **THEN** it is removed from favorites
- **AND** the active figure remains unchanged

#### Scenario: Persistence

- **WHEN** the application reloads
- **THEN** the same favorites are present
- **AND** they are ordered by the catalog, not by when they were starred

#### Scenario: Unknown favorite

- **WHEN** a favorite refers to a preset that no longer exists
- **THEN** it is ignored and removed from stored metadata

### Requirement: Recent presets

The system SHALL remember the presets the user most recently opened.

#### Scenario: Applying a preset

- **WHEN** a preset is successfully applied
- **THEN** it becomes the most recent preset
- **AND** applying it again moves it to the front without duplication

#### Scenario: Recent limit and order

- **WHEN** more than eight presets have been opened
- **THEN** only the eight most recent remain
- **AND** the list is ordered most-recent-first

#### Scenario: Recent persistence

- **WHEN** the application reloads
- **THEN** the recent list is preserved
- **AND** entries for missing presets are pruned

#### Scenario: Non-apply actions

- **WHEN** the user saves, imports, restores a checkpoint, undoes or mutates
- **THEN** the recent list is not changed

### Requirement: Usage metadata isolation

Favorites and recents SHALL be workspace state, not document content.

#### Scenario: Preset export

- **WHEN** a preset or document is exported
- **THEN** favorites, recents and previews are not included
- **AND** importing the export elsewhere starts without them

#### Scenario: Corrupt metadata

- **WHEN** stored usage metadata is malformed
- **THEN** the system starts with an empty favorites and recent list
- **AND** existing presets and documents still load

#### Scenario: Storage failure

- **WHEN** usage metadata cannot be persisted
- **THEN** favorites and recents keep working for the current session
- **AND** no preset operation fails because of it

### Requirement: Usage filters compose with search

Favorites and recents SHALL remain discoverable through the existing search
and filter controls.

#### Scenario: Favorites with search

- **WHEN** the Favorites filter is active and the user types a search term
- **THEN** only matching favorites are listed

#### Scenario: Recent order

- **WHEN** the Recent filter is active
- **THEN** results are listed in recency order
- **AND** category grouping does not reorder them

#### Scenario: Counts

- **WHEN** the browser renders its filters
- **THEN** Favorites and Recent report accurate counts
- **AND** an empty filter has an explanatory empty state
