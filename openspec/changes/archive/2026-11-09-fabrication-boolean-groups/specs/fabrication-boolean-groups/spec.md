## Purpose

Allow one preset to define independent boolean groups and export the results as
multiple bodies without a new CSG engine.

## ADDED Requirements

### Requirement: Grouped booleans

Fabricate SHALL run each boolean group independently.

#### Scenario: Difference groups

- **WHEN** a preset defines two difference groups
- **THEN** each group subtracts its own inner layers
- **AND** the results remain separate bodies

#### Scenario: Single-layer group

- **WHEN** a group contains one layer
- **THEN** that layer is exported as a body without a boolean

#### Scenario: Failure

- **WHEN** a group has no validated bodies or the boolean fails
- **THEN** the preset is not exportable
- **AND** the reason identifies the group

### Requirement: Multi-body output

Grouped results SHALL export as separate 3MF objects.

#### Scenario: 3MF

- **WHEN** a grouped preset with three results is exported
- **THEN** the package contains three objects
- **AND** the report says three bodies

### Requirement: Compatibility

Grouped presets SHALL NOT change the existing single-boolean path.

#### Scenario: Existing preset

- **WHEN** a preset has no groups
- **THEN** `scope` and `boolean` behave exactly as before
