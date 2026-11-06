# fabricate-workflow Specification

## Purpose
Make Fabricate scannable and actionable without changing geometry or export.
## Requirements
### Requirement: Grouped controls

Fabricate SHALL group controls by task.

#### Scenario: Groups

- **WHEN** the Fabricate section renders
- **THEN** Source, Repair, Combine, Output and Checks groups are visible
- **AND** existing controls keep their behavior

### Requirement: Plan summary

Fabricate SHALL summarize the intended operation.

#### Scenario: Summary

- **WHEN** preparation changes
- **THEN** the plan shows scope, repair/SDF, boolean, format and units
- **AND** it reflects the current report state

### Requirement: Quality presets

Fabricate SHALL provide Draft/Standard/High presets.

#### Scenario: Preset

- **WHEN** the user selects a preset
- **THEN** the repair resolution is set to 32/64/128
- **AND** manual resolution changes mark the preset Custom

### Requirement: Suggested resolution

Fabricate SHALL show an advisory resolution.

#### Scenario: Suggestion

- **WHEN** a source bbox is available
- **THEN** the suggested resolution is derived from its diagonal
- **AND** no setting is changed automatically

### Requirement: Next action

Fabricate SHALL explain the first blocker or readiness.

#### Scenario: Missing units

- **WHEN** the document is unitless
- **THEN** the next action asks for a world scale

#### Scenario: Open source

- **WHEN** no closed body exists and repair is off
- **THEN** the next action suggests Repair or Cap

#### Scenario: Ready

- **WHEN** the report is exportable
- **THEN** the next action says it is ready to export

