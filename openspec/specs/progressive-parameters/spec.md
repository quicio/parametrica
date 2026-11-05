# progressive-parameters Specification

## Purpose
Show shape-defining parameters first and keep advanced controls available without overwhelming the panel.
## Requirements
### Requirement: Essential parameters

Shape-defining generator parameters SHALL remain visible by default.

#### Scenario: Lissajous

- **WHEN** the Lissajous generator is active
- **THEN** a/b, phase and amplitude controls are visible in Parameters
- **AND** samples, adaptive, closed and fit are behind Advanced

### Requirement: Advanced disclosure

Technical parameters SHALL declare `advanced: true` in their schema and live in
a persisted Advanced group.

#### Scenario: Open advanced

- **WHEN** the user opens Advanced
- **THEN** sampling, domain, fit and depth controls become visible
- **AND** the open state survives a panel rebuild

#### Scenario: Schema-owned classification

- **WHEN** a new generator or operator is added
- **THEN** its essential/advanced split is declared in the parameter schema
- **AND** the panel does not require a global generator-name list

### Requirement: No empty disclosure

If a generator has no essential plain parameters, its advanced controls SHALL
render inside the Advanced group, and the group SHALL be visible and open by
default.

#### Scenario: All-advanced generator

- **WHEN** every plain parameter is classified as advanced
- **THEN** the Advanced toggle is shown
- **AND** its controls are visible by default
- **AND** only one Modulate (time) folder exists for the generator
