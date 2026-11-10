## ADDED Requirements

### Requirement: Typed figure descriptor

The deterministic figure descriptor SHALL be strict TypeScript.

#### Scenario: Descriptor computation

- **WHEN** a document, evaluated curves and optional layers/geometry are described
- **THEN** inputs, stats, world data and layer descriptors are typed
- **AND** values, hashes and ordering are unchanged

#### Scenario: Analysis helpers

- **WHEN** symmetry, Fourier, complexity, topology or coverage is computed
- **THEN** sampling, budgets and results are typed
- **AND** numerical output is unchanged

### Requirement: Descriptor compatibility

The old `lab/descriptor.js` path SHALL keep resolving.

#### Scenario: Import

- **WHEN** App, notebook, sensitivity, advisor, UI or tests import the old path
- **THEN** a compatibility re-export resolves
- **AND** behavior is unchanged
