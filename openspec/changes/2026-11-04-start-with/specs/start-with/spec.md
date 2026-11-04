## Purpose

Give first-run and new-document users a clear starting point without hiding the
existing preset library.

## ADDED Requirements

### Requirement: First-run chooser

The app SHALL show a Start With chooser when no valid session exists.

#### Scenario: Fresh app

- **WHEN** the app starts without a valid session
- **THEN** the Start With overlay is shown
- **AND** Vortex Stack, Classic Parametric and Torus are offered
- **AND** Vortex Stack is visually featured

#### Scenario: Valid session

- **WHEN** the app starts with a valid session
- **THEN** the session is restored automatically
- **AND** the Start With overlay is not shown

#### Scenario: Invalid session

- **WHEN** the saved session is invalid
- **THEN** it is treated as no session
- **AND** the Start With overlay is shown

### Requirement: Starting cards

Each card SHALL identify the starting figure.

#### Scenario: Vortex Stack

- **WHEN** the user chooses Vortex Stack
- **THEN** the built-in composition is applied
- **AND** the overlay closes
- **AND** the session is saved

#### Scenario: Classic Parametric

- **WHEN** the user chooses Classic Parametric
- **THEN** the default parametric document is created
- **AND** the session is saved

#### Scenario: Torus

- **WHEN** the user chooses Torus
- **THEN** the built-in Torus preset is applied
- **AND** the session is saved

#### Scenario: Preview fallback

- **WHEN** a card preview cannot be generated
- **THEN** a stable placeholder is shown
- **AND** the card remains selectable

### Requirement: New document action

The Layers bar SHALL expose a New document action.

#### Scenario: Reopen chooser

- **WHEN** the user activates New document
- **THEN** the Start With overlay opens over the current document
- **AND** Cancel preserves the current document
- **AND** choosing a card replaces the document

#### Scenario: Replacement

- **WHEN** a card is chosen from New document
- **THEN** the new document flows through the normal adopt/rebuild/undo path
- **AND** no automatic checkpoint or preset is created

### Requirement: Modal accessibility

The overlay SHALL be operable without a pointer.

#### Scenario: Keyboard

- **WHEN** the overlay opens
- **THEN** focus moves to the featured card
- **AND** Tab remains inside the overlay
- **AND** Enter or Space selects
- **AND** Escape cancels or chooses Classic on first run

### Requirement: Failure isolation

A failed card choice SHALL NOT destroy the current document.

#### Scenario: Preset failure

- **WHEN** a chosen preset cannot be instantiated
- **THEN** the overlay remains open
- **AND** an error is reported
- **AND** the current document is unchanged
