## ADDED Requirements

### Requirement: Typed evaluation engine

The evaluation engine SHALL be strict TypeScript.

#### Scenario: Document evaluation

- **WHEN** a document, generator stack, spatial pipeline or surface pipeline is
  evaluated
- **THEN** stages, params, geometry, curves, errors, stats and caches are typed
- **AND** evaluated output and cache reuse are unchanged

#### Scenario: Layers and instances

- **WHEN** generator and instance layers are evaluated
- **THEN** layer results, source lookups, transforms and errors are typed
- **AND** layer order, visibility and instance rules are unchanged

#### Scenario: Budgets

- **WHEN** curves are sanitized, split or decimated
- **THEN** point budgets and curve contracts are typed
- **AND** point limits and decimation are unchanged

### Requirement: Engine compatibility

The old `core/engine.js` path SHALL keep resolving.

#### Scenario: Import

- **WHEN** App, previews, presets, mutation, sensitivity, lab, export, UI or
  tests import the old path
- **THEN** a compatibility re-export resolves
- **AND** behavior is unchanged
