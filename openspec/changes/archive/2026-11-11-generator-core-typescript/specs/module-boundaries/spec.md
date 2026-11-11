## ADDED Requirements

### Requirement: Typed generator core

Generator context, composition helpers and the classic 2D generators SHALL be
strict TypeScript.

#### Scenario: Context and composition

- **WHEN** expressions are compiled or multi-curve generators compose points
- **THEN** contexts, scopes, branch functions and curves are typed
- **AND** sampling and post-processing are unchanged

#### Scenario: Classic generators

- **WHEN** Lissajous, Rose, Superformula, Harmonic Oscillator or Parametric
  generate curves
- **THEN** params, domains and sample functions are typed
- **AND** generated geometry is unchanged

### Requirement: Generator compatibility

The old generator `.js` paths SHALL keep resolving.

#### Scenario: Import

- **WHEN** the generator index, presets or tests import the old paths
- **THEN** compatibility re-exports resolve
- **AND** behavior is unchanged
