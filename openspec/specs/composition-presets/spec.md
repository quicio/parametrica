# composition-presets Specification

## Purpose
Ship a built-in composition that demonstrates instance layers without requiring
a console script.
## Requirements
### Requirement: Vortex Stack preset

The preset library SHALL include a built-in **Vortex Stack** composition.

#### Scenario: Document shape

- **WHEN** the preset is instantiated
- **THEN** it contains one hidden generator source and five instance layers
- **AND** the source is `parametric-surface`
- **AND** the active layer is the first instance
- **AND** no evaluation errors are produced

#### Scenario: Instance transforms

- **WHEN** the preset is inspected
- **THEN** each instance has `translate`, `rotate` and `scale`
- **AND** the five instances use the documented Z, rotation, scale and opacity
  progression

#### Scenario: Shared source

- **WHEN** a source parameter changes
- **THEN** all five instances re-evaluate from the same source
- **AND** their own transforms remain unchanged

### Requirement: View

The preset SHALL use the documented starter view.

#### Scenario: Opening the preset

- **WHEN** the preset is applied
- **THEN** the projection is 3D
- **AND** render modes are `['stroke']`
- **AND** guides and diagnostic overlays are off
- **AND** the camera uses yaw `-0.6` and pitch `0.34`

### Requirement: Determinism

The preset SHALL produce the same composition structure and geometry for the
same seed/time.

#### Scenario: Repeated instantiation

- **WHEN** the factory runs more than once
- **THEN** layer kinds, names, sources, params, operators and styles match
- **AND** only generated ids may differ

### Requirement: Open-surface limitation

The preset SHALL remain an exploration composition, not a fabrication body.

#### Scenario: Fabricate

- **WHEN** the preset is opened in Fabricate
- **THEN** the open helical source is not treated as a closed solid
- **AND** the single-body limitation remains visible

### Requirement: No new editor

The preset SHALL NOT add a composition workspace or new operator.

#### Scenario: Editing

- **WHEN** the user opens the preset
- **THEN** existing Layers/Instance/Operators UI is used
- **AND** the preset can be saved as a user preset or checkpoint

