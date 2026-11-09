# ui-hardening Specification

## Purpose
Harden the existing web UI for 200% zoom, narrow viewports, keyboard users and
reduced-motion users without changing the dark instrument identity.
## Requirements
### Requirement: Responsive stage

The stage SHALL fit the viewport without page-level horizontal overflow.

#### Scenario: 200% zoom

- **WHEN** the CSS viewport is 720x450
- **THEN** canvas and rail remain inside the viewport
- **AND** the rail scrolls internally
- **AND** the mode bar remains usable

#### Scenario: Tablet width

- **WHEN** the viewport is 900x600
- **THEN** the stacked layout uses the available height
- **AND** no panel extends below the viewport

### Requirement: Keyboard navigation

Modes and layer selection SHALL be operable without a mouse.

#### Scenario: Modes

- **WHEN** a mode tab has focus
- **THEN** ArrowLeft/ArrowRight/Home/End move focus and selection
- **AND** the active tab controls one labelled tabpanel

#### Scenario: Layers

- **WHEN** a layer row has focus
- **THEN** Enter or Space selects it
- **AND** its actions have accessible names

### Requirement: Focus and motion

Focus SHALL be distinguishable from active state and motion SHALL respect user
preference.

#### Scenario: Focus

- **WHEN** an interactive element receives keyboard focus
- **THEN** it shows a visible outline distinct from the red active state

#### Scenario: Reduced motion

- **WHEN** the user prefers reduced motion
- **THEN** non-essential animations and transitions are effectively disabled

### Requirement: Readability floor

Functional text SHALL remain readable at the supported breakpoints.

#### Scenario: Functional text

- **WHEN** the panel is rendered
- **THEN** functional labels are at least 11px
- **AND** text contrast meets AA

