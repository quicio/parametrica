## ADDED Requirements

### Requirement: Registered parameter types

Every parameter type SHALL be registered with its sanitation rules and its
editor factory.

#### Scenario: Existing types

- **WHEN** the editor is built
- **THEN** number, boolean, select, expression, source and harmonics controls
  are provided by the parameter registry
- **AND** no shared UI file contains type-specific branches for them

#### Scenario: New type

- **WHEN** a new type such as color, vector or file is registered
- **THEN** generators and operators can declare it
- **AND** the parameter panel renders it without editing `Controls` or
  `OperatorStack`

### Requirement: One StageEditor

Generators and operators SHALL use the same StageEditor for controls, advanced
disclosure, modulation fields and expression editors.

#### Scenario: Generator parameters

- **WHEN** a generator is selected
- **THEN** essential controls, Advanced parameters and one Modulate (time)
  folder are rendered by the StageEditor

#### Scenario: Operator parameters

- **WHEN** an operator is added
- **THEN** its numeric, boolean, select and expression parameters use the same
  StageEditor
- **AND** expression errors appear inline on the matching field

### Requirement: Exact and bounded numbers

Number controls SHALL support an independent visual slider range, typed exact
values, snap on/off and hard limits.

#### Scenario: Typed exact value

- **WHEN** the schema sets `snap = false`
- **THEN** typing a decimal value stores that value exactly within the hard
  bounds
- **AND** the slider may still use a coarser visual step

#### Scenario: Hard bounds

- **WHEN** a number declares `hardMin`/`hardMax` wider than the slider range
- **THEN** the typed value is clamped to the hard bounds, not the slider bounds

### Requirement: Schema-owned progressive disclosure

Parameter schemas SHALL declare whether a control is essential or advanced.

#### Scenario: Essential parameter

- **WHEN** a parameter has `advanced: false` or omits it
- **THEN** it appears before the Advanced disclosure

#### Scenario: Advanced parameter

- **WHEN** a parameter has `advanced: true`
- **THEN** it appears inside the persisted Advanced group
- **AND** all-advanced generators still show the toggle with controls visible
  by default
