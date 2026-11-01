# registry-contracts Specification

## Purpose
TBD - created by archiving change 2026-11-01-extensibility-refactor. Update Purpose after archive.
## Requirements
### Requirement: Validated stage definitions

Registries SHALL validate definitions when they are registered.

#### Scenario: Invalid generator

- **WHEN** a generator is missing `id`, `params` or `sample`
- **THEN** registration fails immediately
- **AND** the error identifies the missing field and generator id

#### Scenario: Unknown parameter type

- **WHEN** a definition declares a parameter type that is not registered
- **THEN** registration fails with an actionable message

#### Scenario: Duplicate id

- **WHEN** two definitions use the same id in the same registry
- **THEN** the second registration is rejected

### Requirement: Documented definition hooks

Optional stage hooks SHALL be documented and invoked generically.

#### Scenario: Warp preview

- **WHEN** Warp is in automatic mode
- **THEN** `previewParams` supplies the generated equations
- **AND** the StageEditor displays them without Warp-specific code

#### Scenario: Manual override

- **WHEN** the user edits an equation
- **THEN** `onExpressionChange` switches the operator to manual mode

### Requirement: Contract test coverage

The test suite SHALL walk every registered generator, operator and render pass
and assert its contract.

#### Scenario: Full registry sweep

- **WHEN** the unit suite runs
- **THEN** every registered definition has the required functions, valid
  schema and recognised capabilities
- **AND** invalid fixtures are rejected in the same group

