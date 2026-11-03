## Purpose

Expose the active figure's parametric properties as a minimal, read-only edge
overlay.

## ADDED Requirements

### Requirement: Active-shape summary

The overlay SHALL list the active layer's generator, parameter values, seed and
enabled operator names.

#### Scenario: Generator parameters

- **WHEN** a Helix preset is active
- **THEN** the overlay shows its generator name and parameter labels/values
- **AND** advanced values are visually secondary

#### Scenario: Operators

- **WHEN** the active layer has enabled operators
- **THEN** their names appear in the summary footer

### Requirement: Visibility

The overlay SHALL be toggleable and persist its visibility.

#### Scenario: Canvas button

- **WHEN** the user activates the `ƒ` button
- **THEN** the overlay body hides or shows
- **AND** the Canvas checkbox stays in sync

#### Scenario: Reload

- **WHEN** the user hides the overlay and reloads
- **THEN** it remains hidden

### Requirement: Live, read-only

The overlay SHALL update with the current document and never mutate it.

#### Scenario: Parameter change

- **WHEN** the active parameter changes
- **THEN** its displayed value updates
- **AND** the document is not modified by the overlay
