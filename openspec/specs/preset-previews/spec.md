# preset-previews Specification

## Purpose
Gives every preset a deterministic, derived thumbnail so users can recognise a
form before opening it, without touching the active document or the network.
## Requirements
### Requirement: Derived preset previews

The system SHALL derive a preview image for every preset from the preset
document itself.

#### Scenario: Built-in preview

- **WHEN** the preset browser needs a preview for a built-in preset
- **THEN** the preview reflects that preset's geometry at `time = 0`
- **AND** it uses a fixed preview presentation independent of the active theme
- **AND** the active document, history and notebook are unchanged

#### Scenario: User preset preview

- **WHEN** a user preset is saved or opened in the browser
- **THEN** its preview is derived from the saved document
- **AND** overwriting the preset eventually replaces the preview

#### Scenario: Repeated request

- **WHEN** the same unchanged preset preview is requested more than once
- **THEN** the cached image is reused
- **AND** the preset document is not evaluated again

### Requirement: Preview cache and invalidation

Preview images SHALL be cached by preset identity and invalidated when the
preset or the preview presentation changes.

#### Scenario: Preset overwritten

- **WHEN** a user preset with the same name is saved with different content
- **THEN** its previous preview is no longer served
- **AND** a new preview is generated when next needed

#### Scenario: Preset deleted

- **WHEN** a user preset is deleted
- **THEN** its preview is removed from the cache and from persistent metadata

#### Scenario: Preview presentation changes

- **WHEN** the preview profile version changes
- **THEN** cached previews are treated as stale
- **AND** presets are re-rendered with the new profile

#### Scenario: Persistence limits

- **WHEN** a derived preview is too large to persist
- **THEN** it remains available for the current session only
- **AND** the preset library still functions normally

### Requirement: Preview isolation and privacy

Preview generation SHALL be local, derived and side-effect free.

#### Scenario: Active figure isolation

- **WHEN** previews are generated while a figure is open
- **THEN** the figure, its view, its parameter values and its undo history are
  unchanged
- **AND** no preset is applied as a side effect

#### Scenario: No network access

- **WHEN** any preview is generated or displayed
- **THEN** no network request is made

#### Scenario: Surface previews

- **WHEN** the preset is a surface
- **THEN** its preview uses the same projected wireframe representation the
  application already uses for strokes and SVG export
- **AND** filled or shaded surface previews are not required

### Requirement: Preview failure and fallback

Preview failures SHALL degrade to a stable placeholder.

#### Scenario: Evaluation fails

- **WHEN** a preset cannot be evaluated or rasterised
- **THEN** the browser shows a fixed-size placeholder instead of a broken image
- **AND** every other preset remains usable

#### Scenario: Storage unavailable

- **WHEN** persistent storage is unavailable or full
- **THEN** previews remain available for the current session
- **AND** the failure does not prevent applying, saving or deleting presets

### Requirement: Preview accessibility

Preview images SHALL not duplicate the preset name for assistive technology.

#### Scenario: Screen reader row

- **WHEN** a preset row is read by a screen reader
- **THEN** the preview is treated as decorative
- **AND** the preset name is announced from the adjacent text

