## ADDED Requirements

### Requirement: Typed attractors

The strange-attractor generators SHALL be strict TypeScript.

#### Scenario: Generation

- **WHEN** Lorenz, Clifford, De Jong or Aizawa trajectories are generated
- **THEN** params, starts, iteration and projections are typed
- **AND** geometry is unchanged

### Requirement: Attractor compatibility

The old `generators/attractors.js` path SHALL keep resolving.

#### Scenario: Import

- **WHEN** the generator index, presets or tests import the old path
- **THEN** a compatibility re-export resolves
- **AND** behavior is unchanged
