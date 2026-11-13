## ADDED Requirements

### Requirement: Typed lattice network

The surface-of-revolution lattice network SHALL be strict TypeScript.

#### Scenario: Build

- **WHEN** a lattice network is generated from a spec
- **THEN** seeds, cells, openings, nodes, edges and stats are typed
- **AND** network geometry, ordering and hashes are unchanged

### Requirement: Lattice network compatibility

The old `geometry/latticeNetwork.js` path SHALL keep resolving.

#### Scenario: Import

- **WHEN** generators, perforation or tests import the old path
- **THEN** a compatibility re-export resolves
- **AND** behavior is unchanged
