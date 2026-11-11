## ADDED Requirements

### Requirement: Typed surface lattice

The surface lattice generator SHALL be strict TypeScript.

#### Scenario: Generation

- **WHEN** a lattice network is built and projected
- **THEN** params, cells, edges, openings, cache and projection are typed
- **AND** geometry is unchanged

### Requirement: Lattice compatibility

The old `generators/surfaceLattice.js` path SHALL keep resolving.

#### Scenario: Import

- **WHEN** the generator index, presets or tests import the old path
- **THEN** a compatibility re-export resolves
- **AND** behavior is unchanged
