## Purpose

Let users keep named background/stroke/fill palettes locally and apply them as
explicit document values.

## ADDED Requirements

### Requirement: Custom palette storage

The system SHALL persist user palettes locally with sanitized names and colors.

#### Scenario: Save and reload

- **WHEN** the user saves a named palette
- **THEN** it appears in the palette list
- **AND** it survives a reload

#### Scenario: Replace

- **WHEN** the user saves a palette with an existing custom name
- **THEN** the existing entry is updated
- **AND** no duplicate is created

#### Scenario: Delete

- **WHEN** the user deletes a custom palette
- **THEN** it is removed from storage and the list
- **AND** built-in palettes remain

### Requirement: Application

Applying a custom palette SHALL write explicit background, stroke and fill
values.

#### Scenario: Apply

- **WHEN** the user selects a custom palette
- **THEN** the artboard background and active-layer stroke/fill change
- **AND** the document remains self-contained

### Requirement: Independence

Custom palettes SHALL NOT synchronize the color ramp, metric or other passes.

#### Scenario: Ramp

- **WHEN** a custom palette is applied
- **THEN** `view.colorRamp` and `view.colorMetric` are unchanged

### Requirement: Built-in integrity

Built-in palettes SHALL remain immutable.

#### Scenario: Delete built-in

- **WHEN** a built-in palette is selected
- **THEN** Delete is unavailable
