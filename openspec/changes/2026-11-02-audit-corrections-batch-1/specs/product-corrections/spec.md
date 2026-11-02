## Purpose

Closes the remaining non-LOOK audit gaps whose solutions are clear: one
authoritative stroke width, layer rename, Notebook metadata editing, a
reproducible Explore seed, and distinct status/telemetry readouts.

## ADDED Requirements

### Requirement: Single authoritative stroke width

Stroke width SHALL have one authoritative stored value per layer.

#### Scenario: Edit width

- **WHEN** the user changes the stroke width
- **THEN** the layer style, render and SVG export use the same value
- **AND** a legacy view-level width does not diverge from it

#### Scenario: Legacy document

- **WHEN** an older document contains only a view-level stroke width
- **THEN** it loads with that value applied to the active layer style
- **AND** no document version migration is required

### Requirement: Layer rename

Users SHALL be able to rename a layer without changing any other layer.

#### Scenario: Rename

- **WHEN** the user activates Rename on a layer
- **THEN** the layer name is trimmed and saved
- **AND** the Layers row and panel status show the new name
- **AND** other layers are unchanged

#### Scenario: Invalid name

- **WHEN** the submitted name is empty
- **THEN** the previous name is kept
- **AND** no error corrupts the document

#### Scenario: Content lock

- **WHEN** a layer is content-locked
- **THEN** rename remains available because it is an identity action, not
  content editing
- **AND** this behavior is consistent with the declared lock scope

### Requirement: Notebook metadata

Users SHALL be able to edit notes and tags on a Notebook checkpoint.

#### Scenario: Edit metadata

- **WHEN** the user opens the metadata editor for a checkpoint
- **THEN** notes and tags can be edited and saved
- **AND** the values persist across reloads
- **AND** tags remain visible in the checkpoint item

#### Scenario: Limits and clearing

- **WHEN** notes or tags exceed the Notebook limits
- **THEN** the existing sanitization rules apply
- **AND** an empty value clears the field

### Requirement: Reproducible Explore seed

Explore randomisation SHALL expose and use a visible seed.

#### Scenario: Same seed

- **WHEN** the user runs Randomize selected with the same document, selection,
  intensity and seed
- **THEN** the same candidate set is produced

#### Scenario: New seed

- **WHEN** the user activates New seed
- **THEN** the visible seed changes
- **AND** the next randomisation uses the new seed

#### Scenario: Scope

- **WHEN** the seed is changed
- **THEN** it remains UI state and is not written into the document
- **AND** it survives Explore panel rebuilds in the current session

### Requirement: Distinct status and telemetry

Panel status and canvas telemetry SHALL report different, non-duplicated
information.

#### Scenario: Panel status

- **WHEN** the panel status is displayed
- **THEN** it reports active-layer context: layer index/total, name,
  visibility/lock, generator, operators, modulations, tracks and projection

#### Scenario: Telemetry

- **WHEN** the canvas telemetry is displayed
- **THEN** it reports performance/global state: curves, points, peak, length,
  evaluation time, time, seed and error state
- **AND** it does not repeat model, layer count or operator count already shown
  in panel status
