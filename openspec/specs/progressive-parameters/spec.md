# progressive-parameters Specification

## Purpose
TBD - created by archiving change lab-ui-clarity. Update Purpose after archive.
## Requirements
### Requirement: Essential parameters

Shape-defining generator parameters SHALL remain visible by default.

#### Scenario: Lissajous

- **WHEN** the Lissajous generator is active
- **THEN** a/b, phase and amplitude controls are visible in Parameters
- **AND** samples, adaptive, closed and fit are behind Advanced

### Requirement: Advanced disclosure

Technical parameters SHALL live in a persisted Advanced group.

#### Scenario: Open advanced

- **WHEN** the user opens Advanced
- **THEN** sampling, domain, fit and depth controls become visible
- **AND** the open state survives a panel rebuild

### Requirement: No empty disclosure

If a generator has no essential plain parameters, its advanced controls SHALL
render directly.

#### Scenario: All-advanced generator

- **WHEN** every plain parameter is classified as advanced
- **THEN** no empty Advanced button is shown

